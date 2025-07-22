import { useState, useRef, useEffect, useCallback } from "react";
import { ioChatCompletion } from "../services/ioChatService";
import { fetchNewsArticles, storeArticlesInRAG, generateRagChunk } from "../services/newsRagService";
import { lipsyncTTSService } from "../services/lipsyncTTSService";
import { speechRecognitionService } from "../services/speechRecognitionService";
import { conversationService } from "../services/conversationService";
import { lipsyncManager } from "../App";
import { SendIcon } from "./icons/SendIcon";

// Global state to prevent duplicate TTS processing
let globalTTSProcessing = false;
let globalActiveMessageId = null;

// Function to remove markdown formatting for speech
const filterMarkdownForSpeech = (text) => {
  return text
    // Remove code blocks
    .replace(/``````/g, ' code block ')
    .replace(/`([^`]+)`/g, '$1')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold and italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s]+/g, 'link')
    // Remove bullet points and lists
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove blockquotes
    .replace(/^\s*>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Remove table formatting
    .replace(/\|/g, ' ')
    // Remove extra whitespace and normalize
    .replace(/\s+/g, ' ')
    .trim();
};

export const ChatInterface = ({ micAlwaysOn = false, onActivityUpdate, minimized = false, onMaximize }) => {
  // State for RAG update
  const [isUpdatingRag, setIsUpdatingRag] = useState(false);
  const [ragUpdateMsg, setRagUpdateMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isStreamingSpeech, setIsStreamingSpeech] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [continuousListening, setContinuousListening] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [systemState, setSystemState] = useState('listening'); // 'listening', 'active', or 'inactive'
  const [abortController, setAbortController] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);


    // TTS streaming state
  const [ttsQueue, setTtsQueue] = useState([]);
  const [isProcessingTTS, setIsProcessingTTS] = useState(false);

  
  const ttsQueueRef = useRef([]);
  const isProcessingTTSRef = useRef(false);
  const currentTTSController = useRef(null);

  // Function to update parent component with current activity
  const updateActivity = useCallback((status, userMsg = "", aiMsg = "") => {
    if (onActivityUpdate) {
      onActivityUpdate(status, userMsg, aiMsg);
    }
  }, [onActivityUpdate]);

  // Update activity status when states change
  useEffect(() => {
    if (isListening) {
      if (systemState === 'listening') {
        updateActivity("Waiting for wake word");
      } else if (systemState === 'inactive') {
        updateActivity("System inactive");
      } else {
        updateActivity("Listening");
      }
    } else if (isSpeaking || isStreamingSpeech) {
      updateActivity("Speaking");
    } else if (isLoading) {
      updateActivity("Processing");
    } else {
      if (systemState === 'listening') {
        updateActivity("Waiting for wake word");
      } else if (systemState === 'inactive') {
        updateActivity("System inactive");
      } else {
        updateActivity("Ready");
      }
    }
  }, [isListening, isSpeaking, isStreamingSpeech, isLoading, systemState, updateActivity]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "end",
        inline: "nearest"
      });
    }
  };

  useEffect(() => {
    // Add a small delay to ensure the DOM is updated before scrolling
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages]);

  const handleSpeak = useCallback(async (text) => {
    if (!text.trim()) return;
    try {
      setIsSpeaking(true);
      const cleanText = filterMarkdownForSpeech(text);
      await lipsyncTTSService.speakWithLipsync(cleanText);
    } catch (err) {
      console.error("Failed to speak:", err);
    } finally {
      setIsSpeaking(false);
    }
  }, []);


// Provide a local ioChatService object to match the expected interface
const ioChatService = {
  setSystemPrompt: () => {}, // No-op, as not supported in ioChatService.js
  async generateStreamingResponse(userMessage, onChunk, context = [], abortSignal) {
    // context is an array of {role, content}, userMessage is the latest user input
    // For now, just call ioChatCompletion with the full context
    let messages;
    if (context && context.length > 0) {
      messages = [
        ...context,
        { role: 'user', content: userMessage }
      ];
    } else {
      messages = [
        { role: 'user', content: userMessage }
      ];
    }
    let done = false;
    try {
      const response = await ioChatCompletion(messages);
      if (abortSignal && abortSignal.aborted) return;
      // Simulate streaming by sending the full response in one chunk
      await onChunk(response, response);
    } finally {
      done = true;
    }
  }
};



  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    if (isLoading) {
      console.warn('handleSubmit: Blocked because isLoading is true');
      setIsLoading(false); // Reset loading in case of stuck state
      return;
    }

    // Stop any current speech before starting new response
    clearTTSQueue();

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setError(null);

    // Create an abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);
    currentTTSController.current = new AbortController();

    // Use crypto.randomUUID() for unique IDs
    const userMessageId = crypto.randomUUID();
    const aiMessageId = crypto.randomUUID();

    // Check if TTS is already processing this message
    if (globalTTSProcessing && globalActiveMessageId === aiMessageId) {
      console.log('ChatInterface: TTS already processing this message, skipping duplicate');
      return;
    }

    // Mark this message as being processed
    globalTTSProcessing = true;
    globalActiveMessageId = aiMessageId;

    const newUserMessage = {
      id: userMessageId,
      text: userMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    
    // Update activity with the latest user message
    updateActivity("Processing", userMessage);

    try {
      // Generate the RAG chunk before sending to AI
      let ragChunk = "";
      try {
        const chunk = await generateRagChunk(userMessage);
        // If chunk is an array, join into a string
        ragChunk = Array.isArray(chunk) ? chunk.join("\n") : (chunk || "");
        if (ragChunk) {
          ragChunk = `INSTRUCTION: Use the following news context ONLY if the user's query is about news, current events, or news updates. If the user's question is not related to news, ignore this context and use your own knowledge.\n\n${ragChunk}`;
        }
        console.log('ChatInterface: Generated RAG chunk:', ragChunk);
      } catch (err) {
        console.warn('Failed to generate RAG chunk:', err);
        ragChunk = "";
      }
      const aiMessage = {
        id: aiMessageId,
        text: "",
        sender: "ai",
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      setMessages(prev => [...prev, aiMessage]);

      let fullResponse = "";
      let lastProcessedLength = 0;
console.log("ragchunk", ragChunk);
      // Prepare context: all previous messages as {role, content}
      const context = [
        ...(ragChunk ? [{ role: 'system', content: ragChunk }] : []),
        ...messages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }))
      ];

      // Generate response with streaming using ioChatService
      await ioChatService.generateStreamingResponse(
        userMessage,
        async (chunk, responseText) => {
          // Check if request was aborted
          if (controller.signal.aborted) {
            console.log('ChatInterface: Request aborted, stopping streaming');
            return;
          }
          
          fullResponse = responseText;
          
          // Update UI with the latest response
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, text: responseText }
                : msg
            )
          );

          // Process new text for speech if auto-speak is enabled
          if (autoSpeak && !controller.signal.aborted) {
            const newText = responseText.slice(lastProcessedLength);
            if (newText.trim()) {
              console.log('Processing new text chunk:', newText.substring(0, 50) + '...');
              
              const { readyText, remainingText } = extractSpeechableText(newText);
              
              if (readyText) {
                console.log('Adding ready text to TTS queue:', readyText.substring(0, 50) + '...');
                addToTTSQueue(readyText);
                lastProcessedLength = responseText.length - remainingText.length;
              }
            }
          }
        },
        context,
        controller.signal // Pass abort signal as options if needed
      );

      // Check if request was aborted before completing
      if (controller.signal.aborted) {
        console.log('ChatInterface: Request aborted, cleaning up');
        clearTTSQueue();
        return;
      }

      // Mark streaming as complete
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, isStreaming: false }
            : msg
        )
      );

      // Update activity with the final AI response
      updateActivity("Ready", "", fullResponse.substring(0, 100) + (fullResponse.length > 100 ? "..." : ""));

      // Process any remaining text for speech
      if (autoSpeak && !controller.signal.aborted && fullResponse.trim()) {
        const remainingText = fullResponse.slice(lastProcessedLength);
        if (remainingText.trim()) {
          console.log('Processing remaining text:', remainingText.substring(0, 50) + '...');
          addToTTSQueue(remainingText);
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('ChatInterface: Request was aborted');
        // Remove the incomplete AI message
        setMessages(prev => prev.filter(msg => msg.id !== aiMessageId));
      } else {
        setError(err.message);
        setMessages(prev => prev.filter(msg => msg.sender === "user"));
      }
      clearTTSQueue();
    } finally {
      setIsLoading(false);
      setAbortController(null);
      
      // Reset global TTS processing state
      globalTTSProcessing = false;
      globalActiveMessageId = null;
    }
  }, [inputMessage, isLoading, autoSpeak, abortController, messages]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    // Stop all audio immediately when clearing chat
    clearTTSQueue();
    
    // Clear messages and reset states
    setMessages([]);
    setError(null);
    setIsSpeaking(false);
    setIsStreamingSpeech(false);
    
    // Stop speech recognition if active
    if (isListening) {
      speechRecognitionService.stop();
      setIsListening(false);
      setInterimTranscript("");
    }
    
    // Clear input
    setInputMessage("");
  };

  const stopSpeaking = () => {
    console.log('🛑 EMERGENCY STOP - Killing all audio...');
    
    // Clear TTS queue and stop all speech
    clearTTSQueue();
    
    // Also stop any speech recognition if it's running
    if (isListening) {
      speechRecognitionService.stop();
      setIsListening(false);
      setInterimTranscript("");
    }
    
    // Clear any error states
    setError(null);
    
    // Force update the lipsync manager state
    if (window.lipsyncManager) {
      window.lipsyncManager.state = "idle";
      window.lipsyncManager.viseme = "viseme_sil";
    }
    
    // Additional browser-level audio stopping
    try {
      // Try to stop any HTML audio elements that might be playing
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      
      // Try to stop any video elements that might have audio
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        video.pause();
        video.currentTime = 0;
      });
    } catch (error) {
      console.warn('Error stopping HTML audio/video elements:', error);
    }
    
    console.log('✅ Emergency stop completed - all audio should be silent');
    
    // Restart continuous listening after stopping speech
    if (continuousListening && speechRecognitionSupported) {
      console.log('Restarting continuous listening after speech stop...');
      setTimeout(() => {
        speechRecognitionService.start();
      }, 1000); // Give a moment for audio to stop completely
    }
  };

  const stopAllProcesses = () => {
    console.log('🛑 STOPPING ALL PROCESSES - Audio, AI Response, and Speech...');
    
    // Stop the AI response generation if in progress
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    
    // Stop all audio and streaming speech
    stopSpeaking();
    
    // Reset loading state
    setIsLoading(false);
    
    // Reset global TTS processing state
    globalTTSProcessing = false;
    globalActiveMessageId = null;
    
    console.log('✅ All processes stopped');
  };

  useEffect(() => {
    console.log('ChatInterface mounted, checking speech recognition support...');
    
    const isSupported = speechRecognitionService.isSupported;
    console.log('Speech recognition service isSupported:', isSupported);
    setSpeechRecognitionSupported(isSupported);

    if (isSupported) {
      console.log('Setting up speech recognition callbacks...');
      
      speechRecognitionService.onResultCallback((result) => {
        console.log('Speech recognition result callback:', result);
        try {
          if (result.isFinal && result.final && result.final.trim()) {
            console.log('Final result received:', result.final);
            setInputMessage(result.final.trim());
            setInterimTranscript("");
            setTimeout(() => {
              try {
                handleSubmitSpeech(result.final.trim());
              } catch (err) {
                console.error('Error in handleSubmitSpeech:', err);
              }
            }, 100);
          } else {
            console.log('Interim result received:', result.interim);
            setInterimTranscript(result.interim);
          }
        } catch (err) {
          console.error('Error in STT result callback:', err);
        }
      });

      speechRecognitionService.onStartCallback(() => {
        console.log('Speech recognition started callback');
        setIsListening(true);
        lipsyncManager.isListening = true;
        setError(null);
      });

      speechRecognitionService.onEndCallback(() => {
        console.log('Speech recognition ended callback');
        setIsListening(false);
        lipsyncManager.isListening = false;
        setInterimTranscript("");
        
        // Restart listening if continuous mode is enabled and not currently speaking
        if (continuousListening && !isSpeaking) {
          console.log('Restarting speech recognition in continuous mode...');
          setTimeout(() => {
            speechRecognitionService.start();
          }, 500); // Small delay before restarting
        }
      });

      speechRecognitionService.onErrorCallback((error) => {
        console.log('Speech recognition error callback:', error);
        setIsListening(false);
        lipsyncManager.isListening = false;
        setInterimTranscript("");
        setError(`Speech recognition error: ${error.message}`);
        
        // If in continuous mode and error is not user-related, try to restart
        if (continuousListening && !error.message.includes('not-allowed') && !isSpeaking) {
          console.log('Attempting to restart after error in continuous mode...');
          setTimeout(() => {
            speechRecognitionService.start();
          }, 2000);
        }
      });

      // Add state change callback for wake word system
      speechRecognitionService.onStateChangeCallback((newState) => {
        console.log('System state changed to:', newState);
        setSystemState(newState);
      });

      speechRecognitionService.onWakeWordDetectedCallback(() => {
        console.log('Wake word detected, system activated');
        setError(null);
      });

      speechRecognitionService.onDeactivationDetectedCallback(() => {
        console.log('Deactivation phrase detected, system deactivated');
        setError(null);
      });

      speechRecognitionService.onInactivityTimeoutCallback(() => {
        console.log('If you are curious about anything, just say, Hi,Lotus!');
        setError(null);
      });

      // Initialize the speech recognition system
      speechRecognitionService.initialize();
    }

    // Cleanup function to prevent duplicate setups
    return () => {
      console.log('ChatInterface cleanup - removing speech callbacks');
      speechRecognitionService.cleanup?.();
    };
    // eslint-disable-next-line
  }, []); // Remove dependencies to prevent re-setup

  // Effect to handle micAlwaysOn prop changes
  useEffect(() => {
    setContinuousListening(micAlwaysOn);
    setConversationMode(micAlwaysOn);
    
    if (micAlwaysOn && speechRecognitionSupported && !isListening && !isSpeaking) {
      console.log('Starting conversation mode...');
      conversationService.startConversationMode();
    } else if (!micAlwaysOn && conversationService.isInConversationMode()) {
      console.log('Stopping conversation mode...');
      conversationService.stopConversationMode();
    }
  }, [micAlwaysOn, speechRecognitionSupported, isListening, isSpeaking]);

  // Setup conversation service callbacks
  useEffect(() => {
    conversationService.setCallbacks({
      onUserSpeechStart: () => {
        console.log('ChatInterface: User speech detected');
        setError(null);
      },
      onUserSpeechEnd: () => {
        console.log('ChatInterface: User speech ended');
      },
      onTTSStart: () => {
        console.log('ChatInterface: TTS started via conversation service');
        setIsSpeaking(true);
      },
      onTTSEnd: () => {
        console.log('ChatInterface: TTS ended via conversation service');
        setIsSpeaking(false);
        setIsStreamingSpeech(false);
      },
      onConversationStateChange: (state) => {
        console.log('ChatInterface: Conversation state changed:', state);
        if (state.isListening !== undefined) {
          setIsListening(state.isListening);
        }
        if (state.isSpeaking !== undefined) {
          setIsSpeaking(state.isSpeaking);
        }
        if (state.isConversationMode !== undefined) {
          setConversationMode(state.isConversationMode);
        }
      },
    });

    // Cleanup on unmount
    return () => {
      conversationService.cleanup();
    };
  }, []);

  // Handle speech recognition submission
  const handleSubmitSpeech = useCallback(async (speechText) => {
    if (!speechText.trim()) return;
    if (isLoading) {
      console.warn('handleSubmitSpeech: Blocked because isLoading is true');
      setIsLoading(false); // Reset loading in case of stuck state
      return;
    }

    // Stop any current speech before starting new response
    clearTTSQueue();

    const userMessage = speechText.trim();
    setInputMessage("");
    setError(null);

    // Create an abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);
    currentTTSController.current = new AbortController();

    const userMessageId = crypto.randomUUID();
    const aiMessageId = crypto.randomUUID();

    // Generate the RAG chunk before sending to AI
    let ragChunk = "";
    try {
      const chunk = await generateRagChunk(userMessage);
      ragChunk = Array.isArray(chunk) ? chunk.join("\n") : (chunk || "");
      if (ragChunk) {
        ragChunk = `INSTRUCTION: Use the following news context ONLY if the user's query is about news, current events, or news updates. If the user's question is not related to news, ignore this context and use your own knowledge.\n\n${ragChunk}`;
      }
    } catch (err) {
      console.warn('Failed to generate RAG chunk (voice):', err);
      ragChunk = "";
    }

    const newUserMessage = {
      id: userMessageId,
      text: userMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
      isVoice: true,
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    
    // Update activity with the latest user message (voice input)
    updateActivity("Processing", userMessage);

    try {
      const aiMessage = {
        id: aiMessageId,
        text: "",
        sender: "ai",
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      setMessages(prev => [...prev, aiMessage]);

      let fullResponse = "";
      let lastProcessedLength = 0;

      const context = [
        ...(ragChunk ? [{ role: 'system', content: ragChunk }] : []),
      ];
      // Add previous messages as context
      context.push(...messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })));

      await ioChatService.generateStreamingResponse(
        userMessage,
        async (chunk, responseText) => {
          // Check if request was aborted
          if (controller.signal.aborted) {
            console.log('ChatInterface: Request aborted, stopping streaming (voice)');
            return;
          }
          
          fullResponse = responseText;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? { ...msg, text: responseText }
                : msg
            )
          );

          // Process new text for speech if auto-speak is enabled
          if (autoSpeak && !controller.signal.aborted) {
            const newText = responseText.slice(lastProcessedLength);
            if (newText.trim()) {
              console.log('Processing new text chunk (voice):', newText.substring(0, 50) + '...');
              
              const { readyText, remainingText } = extractSpeechableText(newText);
              
              if (readyText) {
                console.log('Adding ready text to TTS queue (voice):', readyText.substring(0, 50) + '...');
                addToTTSQueue(readyText);
                lastProcessedLength = responseText.length - remainingText.length;
              }
            }
          }
        },
        context,
        controller.signal // Pass abort signal to the streaming service
      );

      // Check if request was aborted before completing
      if (controller.signal.aborted) {
        console.log('ChatInterface: Request aborted, cleaning up (voice)');
        clearTTSQueue();
        return;
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, isStreaming: false }
            : msg
        )
      );

      // Update activity with the final AI response (voice input)
      updateActivity("Ready", "", fullResponse.substring(0, 100) + (fullResponse.length > 100 ? "..." : ""));

      // Process any remaining text for speech
      if (autoSpeak && !controller.signal.aborted && fullResponse.trim()) {
        const remainingText = fullResponse.slice(lastProcessedLength);
        if (remainingText.trim()) {
          console.log('Processing remaining text (voice):', remainingText.substring(0, 50) + '...');
          addToTTSQueue(remainingText);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('ChatInterface: Request was aborted (voice)');
        // Remove the incomplete AI message
        setMessages(prev => prev.filter(msg => msg.id !== aiMessageId));
      } else {
        setError(err.message);
        setMessages(prev => prev.filter(msg => msg.sender === "user"));
      }
      clearTTSQueue();
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  }, [isLoading, autoSpeak, abortController, messages]);

  const toggleListening = async () => {
    console.log('Toggle listening called. Current state:', { 
      speechRecognitionSupported, 
      isListening,
      isSpeaking,
      continuousListening,
      conversationMode
    });

    if (!speechRecognitionSupported) {
      console.error('Speech recognition not supported');
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    // If in conversation mode, toggle conversation service
    if (conversationMode) {
      if (conversationService.isInConversationMode()) {
        console.log('Stopping conversation mode...');
        conversationService.stopConversationMode();
        setConversationMode(false);
      } else {
        console.log('Starting conversation mode...');
        await conversationService.startConversationMode();
        setConversationMode(true);
      }
      return;
    }

    // Manual mode - standard toggle behavior
    if (isListening) {
      console.log('Stopping speech recognition...');
      speechRecognitionService.stop();
    } else {
      if (isSpeaking) {
        console.log('Stopping current speech before starting recognition...');
        stopSpeaking();
      }
      
      console.log('Starting speech recognition...');
      const success = await speechRecognitionService.start();
      
      if (!success) {
        console.error('Failed to start speech recognition');
        setError("Failed to start speech recognition. Please check your microphone permissions.");
      }
    }
  };

  // TTS streaming functions
  const extractSpeechableText = (text) => {
    // Extract sentences that are ready to be spoken
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const lastSentenceEnd = sentences.join('').length;
    
    // If we have complete sentences, return them
    if (sentences.length > 0) {
      return {
        readyText: sentences.join(' ').trim(),
        remainingText: text.slice(lastSentenceEnd).trim()
      };
    }
    
    // If no complete sentences but text is long enough, take phrases
    if (text.length > 50) {
      const phrases = text.match(/[^,;]+[,;]+/g) || [];
      if (phrases.length > 0) {
        const phrasesText = phrases.join(' ').trim();
        return {
          readyText: phrasesText,
          remainingText: text.slice(phrasesText.length).trim()
        };
      }
      
      // If still no phrases, take word chunks
      const words = text.trim().split(/\s+/);
      if (words.length >= 8) {
        const chunkWords = words.slice(0, 8);
        const chunkText = chunkWords.join(' ');
        return {
          readyText: chunkText,
          remainingText: words.slice(8).join(' ')
        };
      }
    }
    
    return {
      readyText: '',
      remainingText: text
    };
  };

  const addToTTSQueue = (text) => {
    if (!text.trim()) return;
    
    const cleanText = filterMarkdownForSpeech(text);
    if (!cleanText.trim()) return;
    
    console.log('Adding to TTS queue:', cleanText.substring(0, 50) + '...');
    
    ttsQueueRef.current.push(cleanText);
    setTtsQueue(prev => [...prev, cleanText]);
    
    // Start processing if not already processing
    if (!isProcessingTTSRef.current) {
      processTTSQueue();
    }
  };

  const processTTSQueue = async () => {
    if (isProcessingTTSRef.current || ttsQueueRef.current.length === 0) {
      return;
    }
    
    console.log('Starting TTS queue processing, queue length:', ttsQueueRef.current.length);
    isProcessingTTSRef.current = true;
    setIsProcessingTTS(true);
    setIsSpeaking(true);
    setIsStreamingSpeech(true);
    
    try {
      while (ttsQueueRef.current.length > 0) {
        // Check if we should stop
        if (currentTTSController.current?.signal.aborted) {
          console.log('TTS processing aborted');
          break;
        }
        
        const textToSpeak = ttsQueueRef.current.shift();
        setTtsQueue(prev => prev.slice(1));
        
        console.log('Speaking chunk:', textToSpeak.substring(0, 50) + '...');
        
        try {
          await lipsyncTTSService.speakWithLipsync(textToSpeak, {
            abortSignal: currentTTSController.current?.signal
          });
          
          console.log('Finished speaking chunk');
          
          // Small delay between chunks for natural flow
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('TTS chunk aborted');
            break;
          } else {
            console.error('Error speaking chunk:', error);
            // Continue with next chunk even if one fails
          }
        }
      }
    } catch (error) {
      console.error('Error in TTS queue processing:', error);
    } finally {
      console.log('TTS queue processing completed');
      isProcessingTTSRef.current = false;
      setIsProcessingTTS(false);
      setIsSpeaking(false);
      setIsStreamingSpeech(false);
    }
  };

  const clearTTSQueue = () => {
    console.log('Clearing TTS queue');
    ttsQueueRef.current = [];
    setTtsQueue([]);
    
    if (currentTTSController.current) {
      currentTTSController.current.abort();
      currentTTSController.current = null;
    }
    
    lipsyncTTSService.emergencyStop();
    
    isProcessingTTSRef.current = false;
    setIsProcessingTTS(false);
    setIsSpeaking(false);
    setIsStreamingSpeech(false);
  };

  // Render minimized interface
  if (minimized) {
    return (
      <div className="flex items-center h-full px-3 space-x-3">
        {/* Talk/Stop Button - Left Corner */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            toggleListening();
          }}
          className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-lg ${
            isListening 
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-red-500/30 animate-pulse' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-blue-500/30'
          }`}
          title={isListening ? "Stop Voice Chat" : "Start Voice Chat"}
        >
          {isListening ? (
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
              <span>Stop</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>Talk</span>
            </span>
          )}
        </button>

        {/* Input Field - Center */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={interimTranscript || inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={isListening ? "Listening..." : "Type your message..."}
            className="w-full px-3 py-2 bg-white/10 backdrop-blur-sm border border-purple-300/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-white placeholder-white/60 text-sm"
            disabled={isLoading}
          />
          <button 
          onClick={(e) => {
            e.stopPropagation();
            handleSubmit(e);
          }}
          disabled={!inputMessage.trim() || isLoading}
          className="px-3 py-[0.68rem] rounded-r-md text-sm font-medium transition-all duration-300 shadow-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none shadow-purple-500/30 absolute right-0"
          title="Send Message"
        >
          <span className="flex items-center space-x-1">
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
               <SendIcon />
            )}
          </span>
        </button>
        </div>

        {/* Send Button - Right Corner */}
        

        {/* Stop Button - Only show when loading */}
        {isLoading && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              stopAllProcesses();
            }}
            className="px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-red-500/30 animate-pulse"
            title="Stop AI Response & Audio"
          >
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
              <span>Stop</span>
            </span>
          </button>
        )}

        {/* Expand Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (onMaximize) onMaximize();
          }}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          title="Expand Chat"
        >
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              isListening ? 'bg-blue-400 animate-pulse' :
              isSpeaking ? 'bg-green-400 animate-pulse' :
              isLoading ? 'bg-yellow-400 animate-pulse' :
              'bg-gray-400'
            }`}></div>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 14l5-5 5 5" />
            </svg>
          </div>
        </button>
      </div>
    );
  }

  // Handler for RAG update
  const handleUpdateRag = async () => {
    setIsUpdatingRag(true);
    setRagUpdateMsg("");
    try {
      const articles = await fetchNewsArticles();
      await storeArticlesInRAG(articles);
      setRagUpdateMsg("🎉 Congratulations! Context is updated with today's latest news. Ask anything from the AI on any topic.");
    } catch (err) {
      setRagUpdateMsg("❌ Failed to update context: " + (err?.message || err));
    } finally {
      setIsUpdatingRag(false);
    }
  };

  // Render full interface
  return (
    <div className="flex flex-col h-[60vh] bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-indigo-800/20 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border border-purple-500/20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/80 to-blue-900/80 backdrop-blur-sm p-4  text-white border-b border-purple-500/30 flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Chat with Avatar</h2>
              <p className="text-sm text-white/80">
                {systemState === 'listening' ? (
                  <span className="inline-flex items-center">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-1 inline-block"></span>
                    Say "Hi, Lotus" to activate
                  </span>
                ) : systemState === 'active' ? (
                  <span className="inline-flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1 inline-block"></span>
                    System active - Ready for queries!
                  </span>
                ) : systemState === 'inactive' ? (
                  <span className="inline-flex items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-1 inline-block"></span>
                    System inactive - Say "Hi, Lotus" to wake up
                  </span>
                ) : (
                  "Ask me anything!"
                )}
                {isSpeaking && (
                  <span className="inline-flex items-center ml-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1 inline-block"></span>
                    {isStreamingSpeech ? "Streaming speech..." : "Speaking..."}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Update RAG with today's news button */}
            <button
              onClick={handleUpdateRag}
              disabled={isUpdatingRag}
              className="bg-blue-500/80 hover:bg-blue-600/80 px-3 py-1 rounded-lg text-sm transition-colors border border-blue-400/30 shadow-lg shadow-blue-500/20 flex items-center space-x-2"
              title="Update RAG with today's news"
            >
              {isUpdatingRag ? (
                <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>Updating...</span>
              ) : (
                <span className="flex items-center"><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Update News Context</span>
              )}
            </button>
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                autoSpeak
                  ? 'bg-green-500/20 text-green-100 border border-green-400/30 shadow-lg shadow-green-500/20'
                  : 'bg-white/20 text-white/70 border border-white/30 hover:bg-white/30'
              }`}
            >
              🔊 Auto-speak
            </button>
            {(isSpeaking || isLoading) && (
              <button
                onClick={isLoading ? stopAllProcesses : stopSpeaking}
                className="bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded-lg text-sm transition-colors border border-red-400/30 shadow-lg shadow-red-500/20"
              >
                🔇 {isLoading ? 'Stop All' : 'Stop'}
              </button>
            )}
            <button
              onClick={clearChat}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-sm transition-colors border border-white/30"
            >
              Clear Chat
            </button>
          </div>
        </div>
      </div>

      {/* RAG update message */}
      {ragUpdateMsg && (
        <div className="mx-4 mt-2 mb-2 p-3 bg-green-500/20 border border-green-400/30 rounded-lg text-green-200 text-sm backdrop-blur-sm z-10">
          {ragUpdateMsg}
        </div>
      )}
      {/* Messages - Scrollable */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-black/10 chat-scrollbar"
        style={{ 
          scrollBehavior: 'smooth',
          overflowAnchor: 'none' // Prevents scroll jumping
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-white/60 mt-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full mx-auto mb-4 flex items-center justify-center border border-purple-400/30">
              <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-white">Welcome to the World of AI!</p>
            <p className="text-sm text-white/80">Start a conversation by typing your message below.</p>
            <p className="text-xs text-white/60 mt-2">
              {speechRecognitionSupported ? (
                <span> • Use the microphone for voice input</span>
              ) : (
                <span className="text-orange-400"> • Voice input not available (requires HTTPS and compatible browser)</span>
              )}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === "user"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
                    : "bg-white/10 backdrop-blur-sm text-white border border-white/20 shadow-lg"
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.text}</div>

                {/* AI message controls */}
                {message.sender === "ai" && !message.isStreaming && message.text && (
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-white/60">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                    <button
                      onClick={() => handleSpeak(message.text)}
                      disabled={isSpeaking}
                      className="text-xs bg-blue-500/80 hover:bg-blue-600/80 disabled:bg-gray-400/80 text-white px-2 py-1 rounded transition-colors backdrop-blur-sm"
                    >
                      🔊 Speak
                    </button>
                  </div>
                )}

                {/* Streaming indicator */}
                {message.isStreaming && (
                  <div className="flex items-center mt-2">
                    <div className="animate-pulse flex space-x-1">
                      <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                    </div>
                  </div>
                )}

                {/* User message timestamp and voice indicator */}
                {message.sender === "user" && (
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs text-white/70">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                    {message.isVoice && (
                      <div className="flex items-center">
                        <svg className="w-3 h-3 text-white/70 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <span className="text-xs text-white/70">Voice</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-red-200 text-sm backdrop-blur-sm z-10">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}


      {/* Input */}
      <div className="p-4 border-t border-purple-500/30 bg-gradient-to-r from-purple-900/50 to-blue-900/50 flex-shrink-0 sticky bottom-0 z-10">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Type your message..."}
                className="w-full px-4 py-2 pr-12 bg-white/10 backdrop-blur-sm border border-purple-300/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none text-white placeholder-white/70"
                rows="1"
                style={{ minHeight: "40px", maxHeight: "120px" }}
                disabled={isLoading}
              />
              <div className="absolute right-2 top-2 text-xs text-white/50">
                {inputMessage.length}/2000
              </div>
              {/* Interim transcript display */}
              {interimTranscript && (
                <div className="absolute bottom-10 left-2 right-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded p-2 text-sm text-blue-200">
                  <span className="opacity-80">{interimTranscript}</span>
                </div>
              )}
            </div>

            {/* Speech Recognition Button */}
            {speechRecognitionSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  conversationMode
                    ? isListening
                      ? 'bg-green-500/20 hover:bg-green-600/20 text-green-200 border border-green-400/30 animate-pulse'
                      : 'bg-orange-500/20 hover:bg-orange-600/20 text-orange-200 border border-orange-400/30'
                    : systemState === 'listening'
                      ? 'bg-yellow-500/20 hover:bg-yellow-600/20 text-yellow-200 border border-yellow-400/30 animate-pulse'
                      : systemState === 'active'
                        ? 'bg-green-500/20 hover:bg-green-600/20 text-green-200 border border-green-400/30'
                        : systemState === 'inactive'
                          ? 'bg-gray-500/20 hover:bg-gray-600/20 text-gray-200 border border-gray-400/30'
                          : isListening
                            ? 'bg-red-500/20 hover:bg-red-600/20 text-red-200 border border-red-400/30'
                            : 'bg-blue-500/20 hover:bg-blue-600/20 text-blue-200 border border-blue-400/30 disabled:bg-gray-400/20'
                }`}
                title={
                  conversationMode 
                    ? "Conversation mode active - Natural speech interruption enabled"
                    : systemState === 'listening'
                      ? "Say 'Hi, Lotus' to activate"
                      : systemState === 'active'
                        ? "System active - Ready for queries. Say 'Thanks, Lotus' to deactivate"
                        : systemState === 'inactive'
                          ? "System inactive - Say 'Hi, Lotus' to wake up"
                          : isListening 
                            ? "Stop listening" 
                            : "Start voice input"
                }
              >
                {conversationMode ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1a9 9 0 00-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2a7 7 0 1114 0v2h-4v8h3c1.66 0 3-1.34 3-3v-7a9 9 0 00-9-9z"/>
                    </svg>
                    <span className="hidden sm:inline">
                      {isListening ? "Listening..." : "Conversation"}
                    </span>
                  </>
                ) : systemState === 'listening' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M13 5.477V18.5a.5.5 0 01-.777.416L7 16H4a1 1 0 01-1-1v-6a1 1 0 011-1h3l5.223-2.916A.5.5 0 0113 5.477z" />
                    </svg>
                    <span className="hidden sm:inline">Wake Word</span>
                  </>
                ) : systemState === 'active' ? (
                  <>
                    <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="hidden sm:inline">Active</span>
                  </>
                ) : systemState === 'inactive' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.5-7 .5 1.5 2 2.5 4.5 2.5 0 .5.5 1.5 1.5 2.5.5-1 1.5-1.5 2.5-1.5a8 8 0 01-2.343 11.657z" />
                    </svg>
                    <span className="hidden sm:inline">Inactive</span>
                  </>
                ) : isListening ? (
                  <>
                    <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                    <span className="hidden sm:inline">Stop</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="hidden sm:inline">Voice</span>
                  </>
                )}
              </button>
            )}

            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-lg shadow-purple-500/30"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <SendIcon />
              )}
              <span className="hidden sm:inline">Ask</span>
            </button>
          </div>
          <div className="text-xs text-white/60 mt-2">
            Press Enter to send, Shift+Enter for new line
            {speechRecognitionSupported && (
              <span> • Click the microphone to use voice input</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
import { lipsyncTTSService } from './lipsyncTTSService.js';

class StreamingSpeechService {
  constructor() {
    this.isStreaming = false;
    this.currentStreamId = null;
    this.speechQueue = [];
    this.isProcessingQueue = false;
    this.currentAbortController = null;
    this.spokenChunks = new Set();
    this.speechBuffer = "";
    this.lastProcessedLength = 0;
    this.isSpeaking = false;
    this.speechMutex = false; // Prevent concurrent speech attempts
    this.streamingCallbacks = {
      onSpeechStart: null,
      onSpeechEnd: null,
      onChunkSpoken: null,
      onError: null
    };
  }

  // Initialize the service
  init() {
    console.log('StreamingSpeechService: Initialized');
  }

  // Set callbacks for streaming events
  setCallbacks(callbacks) {
    this.streamingCallbacks = { ...this.streamingCallbacks, ...callbacks };
  }

  // Start streaming speech for AI response
  async startStreamingSpeech(streamId, abortController = null) {
    if (this.isStreaming) {
      console.log('StreamingSpeechService: Already streaming, stopping previous stream');
      await this.stopStreamingSpeech();
    }

    console.log('StreamingSpeechService: Starting streaming speech for stream ID:', streamId);
    
    this.isStreaming = true;
    this.currentStreamId = streamId;
    this.currentAbortController = abortController;
    this.speechQueue = [];
    this.isProcessingQueue = false;
    this.isSpeaking = false;
    this.speechMutex = false;
    this.spokenChunks.clear();
    this.speechBuffer = "";
    this.lastProcessedLength = 0;

    // Start processing queue
    this.processSpeechQueue();

    return true;
  }

  // Stop streaming speech
  async stopStreamingSpeech() {
    console.log('StreamingSpeechService: Stopping streaming speech');
    
    this.isStreaming = false;
    this.currentStreamId = null;
    this.speechMutex = false;
    this.isSpeaking = false;
    
    // Clear queue with abort
    this.clearQueue();
    
    // Stop current speech
    if (lipsyncTTSService.isSpeaking()) {
      lipsyncTTSService.emergencyStop();
    }
    
    // Trigger callback
    if (this.streamingCallbacks.onSpeechEnd) {
      this.streamingCallbacks.onSpeechEnd();
    }
  }

  // Process incoming text chunks from AI response
  async processTextChunk(chunk, fullResponse) {
    if (!this.isStreaming) {
      console.log('StreamingSpeechService: Not streaming, ignoring chunk');
      return;
    }

    // Check for abort
    if (this.currentAbortController && this.currentAbortController.signal.aborted) {
      console.log('StreamingSpeechService: Stream aborted, stopping processing');
      await this.stopStreamingSpeech();
      return;
    }

    // Update buffer with new content
    const newContent = fullResponse.substring(this.lastProcessedLength);
    this.speechBuffer += newContent;
    this.lastProcessedLength = fullResponse.length;

    // Process the buffer into speech chunks
    await this.processSpeechBufferSequential();
  }

  // Process speech buffer sequentially to avoid race conditions
  async processSpeechBufferSequential() {
    if (!this.speechBuffer.trim()) return;

    // Look for natural break points to create speech chunks
    const sentences = this.extractSentences(this.speechBuffer);
    
    if (sentences.length > 0) {
      // Process complete sentences
      for (const sentence of sentences) {
        if (!this.isStreaming) break;
        
        const trimmed = sentence.trim();
        if (trimmed && trimmed.length > 3) {
          await this.queueSpeechChunk(trimmed);
        }
      }
      
      // Remove processed sentences from buffer
      const processedText = sentences.join('');
      this.speechBuffer = this.speechBuffer.replace(processedText, '');
    } else {
      // If no complete sentences, look for phrases
      const phrases = this.extractPhrases(this.speechBuffer);
      
      if (phrases.length > 0) {
        for (const phrase of phrases) {
          if (!this.isStreaming) break;
          
          const trimmed = phrase.trim();
          if (trimmed && trimmed.length > 5) {
            await this.queueSpeechChunk(trimmed);
          }
        }
        
        // Remove processed phrases from buffer
        const processedText = phrases.join('');
        this.speechBuffer = this.speechBuffer.replace(processedText, '');
      } else {
        // If buffer is long enough, process word chunks
        if (this.speechBuffer.trim().length > 30) {
          const words = this.speechBuffer.trim().split(/\s+/);
          const chunkSize = 5; // Process 5 words at a time
          
          if (words.length >= chunkSize) {
            const wordChunk = words.splice(0, chunkSize).join(' ');
            await this.queueSpeechChunk(wordChunk);
            this.speechBuffer = words.join(' ');
          }
        }
      }
    }
  }

  // Extract complete sentences from text
  extractSentences(text) {
    const sentencePattern = /[^.!?]*[.!?]+/g;
    return text.match(sentencePattern) || [];
  }

  // Extract phrases from text
  extractPhrases(text) {
    const phrasePattern = /[^,;:]*[,;:]+/g;
    return text.match(phrasePattern) || [];
  }

  // Queue a speech chunk for processing
  async queueSpeechChunk(text) {
    if (!this.isStreaming) return;

    // Check for abort
    if (this.currentAbortController && this.currentAbortController.signal.aborted) {
      return;
    }

    // Clean and filter text
    const cleanText = this.filterTextForSpeech(text);
    if (!cleanText.trim() || cleanText.trim().length < 2) return;

    // Check for duplicates using a more sophisticated approach
    const textKey = cleanText.trim().toLowerCase();
    if (this.spokenChunks.has(textKey)) {
      console.log('StreamingSpeechService: Skipping duplicate chunk:', cleanText.substring(0, 50) + '...');
      return;
    }

    // Add to spoken chunks
    this.spokenChunks.add(textKey);

    // Add to queue
    this.speechQueue.push({
      text: cleanText,
      timestamp: Date.now()
    });

    console.log('StreamingSpeechService: Queued speech chunk:', cleanText.substring(0, 50) + '...');

    // Trigger callback
    if (this.streamingCallbacks.onChunkSpoken) {
      this.streamingCallbacks.onChunkSpoken(cleanText);
    }

    // Start queue processing if not already running
    if (!this.isProcessingQueue) {
      this.processSpeechQueue();
    }
  }

  // Process the speech queue with mutex to prevent race conditions
  async processSpeechQueue() {
    if (this.isProcessingQueue || !this.isStreaming || this.speechMutex) {
      return;
    }

    this.isProcessingQueue = true;
    console.log('StreamingSpeechService: Starting queue processing');

    try {
      while (this.speechQueue.length > 0 && this.isStreaming) {
        // Check for abort
        if (this.currentAbortController && this.currentAbortController.signal.aborted) {
          console.log('StreamingSpeechService: Queue processing aborted');
          break;
        }

        const chunk = this.speechQueue.shift();
        
        try {
          // Use mutex to prevent concurrent speech
          this.speechMutex = true;
          
          console.log('StreamingSpeechService: Speaking chunk:', chunk.text.substring(0, 50) + '...');
          
          // Trigger speech start callback if not already speaking
          if (this.streamingCallbacks.onSpeechStart && !this.isSpeaking) {
            this.streamingCallbacks.onSpeechStart();
            this.isSpeaking = true;
          }

          // Speak the chunk with proper error handling
          await lipsyncTTSService.speakWithLipsync(chunk.text, {
            rate: 0.85, // Natural speech rate
            useQueue: false, // Don't use lipsync service queue
            abortSignal: this.currentAbortController?.signal
          });

          console.log('StreamingSpeechService: Successfully spoke chunk');
          
          // Small delay between chunks for natural flow
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error('StreamingSpeechService: Error speaking chunk:', error);
          
          // Only trigger error callback for non-abort errors
          if (error.message !== 'Speech aborted' && this.streamingCallbacks.onError) {
            this.streamingCallbacks.onError(error);
          }
          
          // Break on critical errors
          if (error.message === 'Speech aborted') {
            break;
          }
          
        } finally {
          this.speechMutex = false;
        }
      }
    } finally {
      this.isProcessingQueue = false;
      this.speechMutex = false;
      
      // Trigger end callback if queue is empty and streaming is done
      if (this.speechQueue.length === 0 && this.isSpeaking) {
        this.isSpeaking = false;
        if (this.streamingCallbacks.onSpeechEnd) {
          this.streamingCallbacks.onSpeechEnd();
        }
      }
      
      console.log('StreamingSpeechService: Queue processing completed');
    }
  }

  // Process remaining text in buffer
  async processRemainingText() {
    if (!this.isStreaming || !this.speechBuffer.trim()) return;

    console.log('StreamingSpeechService: Processing remaining text');
    
    // Process any remaining words in the buffer
    const remainingWords = this.speechBuffer.trim().split(/\s+/);
    
    if (remainingWords.length > 0) {
      // Process remaining words in chunks
      const chunkSize = 3;
      while (remainingWords.length > 0) {
        const wordChunk = remainingWords.splice(0, Math.min(chunkSize, remainingWords.length));
        const textChunk = wordChunk.join(' ');
        
        if (textChunk.trim().length >= 2) {
          await this.queueSpeechChunk(textChunk);
        }
      }
    }
    
    // Clear buffer
    this.speechBuffer = "";
  }

  // Clear the speech queue
  clearQueue() {
    console.log('StreamingSpeechService: Clearing speech queue');
    this.speechQueue = [];
    this.isProcessingQueue = false;
    this.speechMutex = false;
    this.isSpeaking = false;
  }

  // Filter text for speech (remove markdown, etc.)
  filterTextForSpeech(text) {
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
  }

  // Get current status
  getStatus() {
    return {
      isStreaming: this.isStreaming,
      currentStreamId: this.currentStreamId,
      queueLength: this.speechQueue.length,
      isProcessingQueue: this.isProcessingQueue,
      isSpeaking: this.isSpeaking,
      speechMutex: this.speechMutex,
      bufferLength: this.speechBuffer.length,
      spokenChunksCount: this.spokenChunks.size
    };
  }

  // Check if currently streaming
  isCurrentlyStreaming() {
    return this.isStreaming;
  }
}

export const streamingSpeechService = new StreamingSpeechService(); 
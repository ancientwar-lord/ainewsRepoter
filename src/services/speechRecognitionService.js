class SpeechRecognitionService {
  constructor() {
    this.recognition = null;
    this.isSupported = false;
    this.isListening = false;
    this.continuous = true;
    this.interimResults = true;
    this.lang = 'en-US';
    
    // State management for wake word system
    this.systemState = 'listening'; // 'listening', 'active', or 'inactive'
    this.activationPhrase = 'hi lotus';
    this.deactivationPhrase = 'thanks lotus';
    this.inactivityTimeout = 30000; // 30 seconds in milliseconds
    this.inactivityTimer = null;
    this.lastActivityTime = Date.now();
    
    this.onResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
    this.onStateChange = null;
    this.onWakeWordDetected = null;
    this.onDeactivationDetected = null;
    this.onInactivityTimeout = null;
    
    this.init();
  }

  init() {
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      this.isSupported = false;
      return;
    }

    console.log('Speech Recognition API found, initializing...');
    this.isSupported = true;
    this.recognition = new SpeechRecognition();
    
    // Configure recognition
    this.recognition.continuous = this.continuous;
    this.recognition.interimResults = this.interimResults;
    this.recognition.lang = this.lang;
    this.recognition.maxAlternatives = 1;

    console.log('Speech Recognition configured:', {
      continuous: this.recognition.continuous,
      interimResults: this.recognition.interimResults,
      lang: this.recognition.lang,
      maxAlternatives: this.recognition.maxAlternatives
    });

    // Set up event listeners
    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('Speech recognition started successfully');
      if (this.onStart) this.onStart();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('Speech recognition ended');
      if (this.onEnd) this.onEnd();
      
      // Auto-restart listening for continuous wake word detection
      if (this.isSupported) {
        console.log('Auto-restarting speech recognition for continuous wake word detection...');
        setTimeout(() => {
          this.start();
        }, 1000);
      }
    };

    this.recognition.onsoundstart = () => {
      console.log('Sound detected by speech recognition');
    };

    this.recognition.onspeechstart = () => {
      console.log('Speech detected by speech recognition');
    };

    this.recognition.onspeechend = () => {
      console.log('Speech ended');
    };

    this.recognition.onsoundend = () => {
      console.log('Sound ended');
    };

    this.recognition.onaudiostart = () => {
      console.log('Audio capture started');
    };

    this.recognition.onaudioend = () => {
      console.log('Audio capture ended');
    };

    this.recognition.onresult = (event) => {
      console.log('Speech recognition result received:', event);
      
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        console.log(`Result ${i}: "${transcript}" (isFinal: ${event.results[i].isFinal})`);
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      console.log('Final transcript:', finalTranscript);
      console.log('Interim transcript:', interimTranscript);

      // Process wake words and state management
      if (finalTranscript.length > 0) {
        const shouldProcessQuery = this.processWakeWords(finalTranscript);
        
        // Only pass through the result if system is active and it's not a wake word
        if (this.onResult && shouldProcessQuery && this.systemState === 'active') {
          this.onResult({
            final: finalTranscript,
            interim: interimTranscript,
            isFinal: finalTranscript.length > 0
          });
        }
      } else if (this.onResult && this.systemState === 'active') {
        // Pass through interim results only if system is active
        this.onResult({
          final: finalTranscript,
          interim: interimTranscript,
          isFinal: finalTranscript.length > 0
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error, event);
      this.isListening = false;
      
      if (this.onError) {
        this.onError({
          error: event.error,
          message: this.getErrorMessage(event.error)
        });
      }
    };

    this.recognition.onnomatch = () => {
      console.log('No speech was recognized');
      if (this.onError) {
        this.onError({
          error: 'no-speech',
          message: 'No speech was recognized'
        });
      }
    };
  }

  getErrorMessage(error) {
    switch (error) {
      case 'no-speech':
        return 'No speech was detected. Please try again.';
      case 'audio-capture':
        return 'No microphone was found. Please check your microphone settings.';
      case 'not-allowed':
        return 'Microphone access was denied. Please allow microphone access.';
      case 'network':
        return 'Network error occurred. Please check your internet connection.';
      case 'service-not-allowed':
        return 'Speech recognition service is not allowed. Please check your browser settings.';
      default:
        return `Speech recognition error: ${error}`;
    }
  }

  async start() {
    if (!this.isSupported) {
      console.error('Speech recognition not supported');
      return false;
    }

    if (this.isListening) {
      console.log('Speech recognition already running');
      return true;
    }

    try {
      // Check for microphone permissions first
      console.log('Checking microphone permissions...');
      
      // Request microphone permission explicitly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
      } catch (permissionError) {
        console.error('Microphone permission denied:', permissionError);
        if (this.onError) {
          this.onError({
            error: 'not-allowed',
            message: 'Microphone access was denied. Please allow microphone access and try again.'
          });
        }
        return false;
      }

      console.log('Starting speech recognition in', this.systemState, 'mode...');
      this.recognition.start();
      
      // Start inactivity timer if in listening state
      if (this.systemState === 'listening') {
        this.startInactivityTimer();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      if (this.onError) {
        this.onError({
          error: 'start-failed',
          message: `Failed to start speech recognition: ${error.message}`
        });
      }
      return false;
    }
  }

  stop() {
    if (!this.isSupported || !this.isListening) {
      return;
    }

    this.recognition.stop();
  }

  abort() {
    if (!this.isSupported || !this.isListening) {
      return;
    }

    this.recognition.abort();
  }

  setLanguage(lang) {
    this.lang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  setContinuous(continuous) {
    this.continuous = continuous;
    if (this.recognition) {
      this.recognition.continuous = continuous;
    }
  }

  setInterimResults(interim) {
    this.interimResults = interim;
    if (this.recognition) {
      this.recognition.interimResults = interim;
    }
  }

  // Wake word processing and state management
  processWakeWords(transcript) {
    const lowerTranscript = transcript.toLowerCase().trim();
    console.log('Processing wake words for:', lowerTranscript, 'Current state:', this.systemState);
    
    // Reset inactivity timer on any speech input
    this.resetInactivityTimer();
    
    if ((this.systemState === 'listening' || this.systemState === 'inactive') && lowerTranscript.includes(this.activationPhrase)) {
      console.log('Wake word detected! Activating system...');
      this.clearInactivityTimer();
      this.systemState = 'active';
      this.speak('Hi Dear', () => {
        console.log('System activated, ready for queries');
        if (this.onWakeWordDetected) {
          this.onWakeWordDetected();
        }
        if (this.onStateChange) {
          this.onStateChange('active');
        }
      });
      return false; // Don't process this as a query
    } else if (this.systemState === 'active' && lowerTranscript.includes(this.deactivationPhrase)) {
      console.log('Deactivation phrase detected! Returning to listening state...');
      this.systemState = 'listening';
      this.speak('Okay, Dear', () => {
        console.log('System deactivated, waiting for wake word');
        this.startInactivityTimer(); // Start timer when going back to listening
        if (this.onDeactivationDetected) {
          this.onDeactivationDetected();
        }
        if (this.onStateChange) {
          this.onStateChange('listening');
        }
      });
      return false; // Don't process this as a query
    }
    
    // If we're in active state and it's not a deactivation phrase, process as query
    return this.systemState === 'active';
  }

  // Helper method to speak responses
  speak(text, onComplete = null) {
    // Import the TTS service dynamically to avoid circular dependencies
    if (typeof window !== 'undefined' && window.lipsyncTTSService) {
      window.lipsyncTTSService.speakWithLipsync(text)
        .then(() => {
          if (onComplete) onComplete();
        })
        .catch(err => {
          console.error('Error speaking:', err);
          if (onComplete) onComplete();
        });
    } else {
      // Fallback to basic speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        if (onComplete) onComplete();
      };
      utterance.onerror = () => {
        if (onComplete) onComplete();
      };
      speechSynthesis.speak(utterance);
    }
  }

  // State management methods
  getSystemState() {
    return this.systemState;
  }

  setSystemState(state) {
    if (state === 'listening' || state === 'active' || state === 'inactive') {
      this.systemState = state;
      console.log('System state changed to:', state);
      
      // Clear timer when changing states
      this.clearInactivityTimer();
      
      // Start inactivity timer if switching to listening state
      if (state === 'listening') {
        this.startInactivityTimer();
      }
      
      if (this.onStateChange) {
        this.onStateChange(state);
      }
    }
  }

  isSystemActive() {
    return this.systemState === 'active';
  }

  isSystemListening() {
    return this.systemState === 'listening';
  }

  isSystemInactive() {
    return this.systemState === 'inactive';
  }

  // Configuration methods
  setActivationPhrase(phrase) {
    this.activationPhrase = phrase.toLowerCase();
    console.log('Activation phrase set to:', this.activationPhrase);
  }

  setDeactivationPhrase(phrase) {
    this.deactivationPhrase = phrase.toLowerCase();
    console.log('Deactivation phrase set to:', this.deactivationPhrase);
  }

  // Event handlers
  onResultCallback(callback) {
    this.onResult = callback;
  }

  onErrorCallback(callback) {
    this.onError = callback;
  }

  onStartCallback(callback) {
    this.onStart = callback;
  }

  onEndCallback(callback) {
    this.onEnd = callback;
  }

  onStateChangeCallback(callback) {
    this.onStateChange = callback;
  }

  onWakeWordDetectedCallback(callback) {
    this.onWakeWordDetected = callback;
  }

  onDeactivationDetectedCallback(callback) {
    this.onDeactivationDetected = callback;
  }

  onInactivityTimeoutCallback(callback) {
    this.onInactivityTimeout = callback;
  }

  // Initialize and start the system
  initialize() {
    if (this.isSupported) {
      console.log('Initializing speech recognition system...');
      this.setSystemState('listening');
      // Auto-start speech recognition
      this.start();
    }
  }

  // Inactivity management
  startInactivityTimer() {
    this.clearInactivityTimer();
    
    if (this.systemState === 'listening') {
      console.log('Starting inactivity timer for 30 seconds...');
      this.inactivityTimer = setTimeout(() => {
        console.log('Inactivity timeout reached, switching to inactive state');
        this.systemState = 'inactive';
        this.speak('If you are curious about anything, just say, Hi,Lotus!', () => {
          console.log('System switched to inactive state');
          if (this.onInactivityTimeout) {
            this.onInactivityTimeout();
          }
          if (this.onStateChange) {
            this.onStateChange('inactive');
          }
        });
      }, this.inactivityTimeout);
    }
  }

  clearInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  resetInactivityTimer() {
    this.lastActivityTime = Date.now();
    this.startInactivityTimer();
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
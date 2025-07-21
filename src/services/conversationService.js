import { lipsyncTTSService } from './lipsyncTTSService';
import { speechRecognitionService } from './speechRecognitionService';

class ConversationService {
  constructor() {
    this.isConversationMode = false;
    this.isListening = false;
    this.isSpeaking = false;
    this.voiceActivityDetector = null;
    this.conversationCallbacks = {
      onUserSpeechStart: null,
      onUserSpeechEnd: null,
      onTTSStart: null,
      onTTSEnd: null,
      onConversationStateChange: null,
    };
    
    // Voice activity detection settings
    this.vadSettings = {
      threshold: 0.01, // Volume threshold for voice detection
      silenceTimeout: 2000, // ms of silence before considering speech ended
      minSpeechDuration: 500, // minimum speech duration to consider valid
    };
    
    this.init();
  }

  init() {
    console.log('ConversationService: Initializing...');
    this.setupVoiceActivityDetection();
    this.setupTTSCallbacks();
    this.setupSTTCallbacks();
  }

  // Setup voice activity detection using Web Audio API
  async setupVoiceActivityDetection() {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.85;
      
      source.connect(analyser);
      
      this.voiceActivityDetector = {
        audioContext,
        analyser,
        stream,
        source,
        isActive: false,
        lastSpeechTime: 0,
        silenceTimer: null,
      };
      
      console.log('ConversationService: Voice activity detection setup complete');
    } catch (error) {
      console.error('ConversationService: Failed to setup voice activity detection:', error);
    }
  }

  // Start monitoring voice activity
  startVoiceActivityMonitoring() {
    if (!this.voiceActivityDetector || !this.isConversationMode) return;
    
    const vad = this.voiceActivityDetector;
    const bufferLength = vad.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const monitor = () => {
      if (!this.isConversationMode) return;
      
      vad.analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const volume = average / 255; // Normalize to 0-1
      
      const now = Date.now();
      const isSpeechDetected = volume > this.vadSettings.threshold;
      
      if (isSpeechDetected) {
        vad.lastSpeechTime = now;
        
        if (!vad.isActive) {
          // Speech started
          this.handleUserSpeechStart();
          vad.isActive = true;
        }
        
        // Clear any existing silence timer
        if (vad.silenceTimer) {
          clearTimeout(vad.silenceTimer);
          vad.silenceTimer = null;
        }
      } else if (vad.isActive) {
        // Check if silence duration exceeds threshold
        const silenceDuration = now - vad.lastSpeechTime;
        
        if (!vad.silenceTimer && silenceDuration > 100) { // Small delay before starting timer
          vad.silenceTimer = setTimeout(() => {
            if (vad.isActive) {
              this.handleUserSpeechEnd();
              vad.isActive = false;
            }
          }, this.vadSettings.silenceTimeout);
        }
      }
      
      // Continue monitoring
      requestAnimationFrame(monitor);
    };
    
    monitor();
    console.log('ConversationService: Voice activity monitoring started');
  }

  // Setup TTS event callbacks
  setupTTSCallbacks() {
    // Monitor when TTS starts and stops
    const originalSpeak = lipsyncTTSService.speakImmediately.bind(lipsyncTTSService);
    
    lipsyncTTSService.speakImmediately = async (...args) => {
      this.handleTTSStart();
      try {
        const result = await originalSpeak(...args);
        this.handleTTSEnd();
        return result;
      } catch (error) {
        this.handleTTSEnd();
        throw error;
      }
    };
  }

  // Setup STT event callbacks
  setupSTTCallbacks() {
    if (speechRecognitionService.isSupported) {
      speechRecognitionService.onStartCallback(() => {
        this.isListening = true;
        this.triggerCallback('onConversationStateChange', {
          isListening: true,
          isSpeaking: this.isSpeaking,
        });
      });

      speechRecognitionService.onEndCallback(() => {
        this.isListening = false;
        this.triggerCallback('onConversationStateChange', {
          isListening: false,
          isSpeaking: this.isSpeaking,
        });
      });
    }
  }

  // Handle when user starts speaking
  handleUserSpeechStart() {
    console.log('ConversationService: User speech detected - interrupting TTS');
    
    // Stop any current TTS
    if (this.isSpeaking) {
      lipsyncTTSService.emergencyStop();
      this.isSpeaking = false;
    }
    
    // Start speech recognition if not already listening
    if (!this.isListening && speechRecognitionService.isSupported) {
      speechRecognitionService.start();
    }
    
    this.triggerCallback('onUserSpeechStart');
  }

  // Handle when user stops speaking
  handleUserSpeechEnd() {
    console.log('ConversationService: User speech ended');
    this.triggerCallback('onUserSpeechEnd');
  }

  // Handle when TTS starts
  handleTTSStart() {
    console.log('ConversationService: TTS started');
    this.isSpeaking = true;
    
    // Stop speech recognition while TTS is playing
    if (this.isListening) {
      speechRecognitionService.stop();
    }
    
    this.triggerCallback('onTTSStart');
    this.triggerCallback('onConversationStateChange', {
      isListening: this.isListening,
      isSpeaking: true,
    });
  }

  // Handle when TTS ends
  handleTTSEnd() {
    console.log('ConversationService: TTS ended');
    this.isSpeaking = false;
    
    // Restart speech recognition if in conversation mode
    if (this.isConversationMode && speechRecognitionService.isSupported) {
      setTimeout(() => {
        if (!this.isSpeaking && this.isConversationMode) {
          speechRecognitionService.start();
        }
      }, 500); // Small delay to ensure TTS is fully stopped
    }
    
    this.triggerCallback('onTTSEnd');
    this.triggerCallback('onConversationStateChange', {
      isListening: this.isListening,
      isSpeaking: false,
    });
  }

  // Start conversation mode
  async startConversationMode() {
    console.log('ConversationService: Starting conversation mode');
    this.isConversationMode = true;
    
    // Start voice activity monitoring
    this.startVoiceActivityMonitoring();
    
    // Start speech recognition
    if (speechRecognitionService.isSupported && !this.isSpeaking) {
      await speechRecognitionService.start();
    }
    
    this.triggerCallback('onConversationStateChange', {
      isConversationMode: true,
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
    });
  }

  // Stop conversation mode
  stopConversationMode() {
    console.log('ConversationService: Stopping conversation mode');
    this.isConversationMode = false;
    
    // Stop speech recognition
    if (this.isListening) {
      speechRecognitionService.stop();
    }
    
    // Stop any current TTS
    if (this.isSpeaking) {
      lipsyncTTSService.emergencyStop();
      this.isSpeaking = false;
    }
    
    this.triggerCallback('onConversationStateChange', {
      isConversationMode: false,
      isListening: false,
      isSpeaking: false,
    });
  }

  // Set callback functions
  setCallbacks(callbacks) {
    this.conversationCallbacks = { ...this.conversationCallbacks, ...callbacks };
  }

  // Trigger callback if it exists
  triggerCallback(callbackName, data = null) {
    const callback = this.conversationCallbacks[callbackName];
    if (callback && typeof callback === 'function') {
      callback(data);
    }
  }

  // Check if conversation mode is active
  isInConversationMode() {
    return this.isConversationMode;
  }

  // Get current conversation state
  getState() {
    return {
      isConversationMode: this.isConversationMode,
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
    };
  }

  // Update VAD sensitivity
  updateVADSettings(settings) {
    this.vadSettings = { ...this.vadSettings, ...settings };
    console.log('ConversationService: VAD settings updated:', this.vadSettings);
  }

  // Cleanup
  cleanup() {
    this.stopConversationMode();
    
    if (this.voiceActivityDetector) {
      const vad = this.voiceActivityDetector;
      if (vad.stream) {
        vad.stream.getTracks().forEach(track => track.stop());
      }
      if (vad.audioContext && vad.audioContext.state !== 'closed') {
        vad.audioContext.close();
      }
      if (vad.silenceTimer) {
        clearTimeout(vad.silenceTimer);
      }
      this.voiceActivityDetector = null;
    }
  }
}

export const conversationService = new ConversationService();

import { lipsyncManager } from "../App";

// Function to get settings from localStorage (fallback if context not available)
const getVoiceSettings = () => {
  try {
    const settings = localStorage.getItem('aiAvatarSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.voice || {};
    }
  } catch (error) {
    console.warn('Could not load voice settings:', error);
  }
  return {
    voice: 'alloy',
    speed: 1.0,
    volume: 0.8,
    language: 'en-US'
  };
};

class LipsyncTTSService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.isInitialized = false;
    this.currentUtterance = null;
    this.isActive = false;
    this.speechQueue = [];
    this.isProcessingQueue = false;
    this.animationFrameId = null;
    this.speechStartTime = null;
    this.currentVisemeSequence = [];
    this.currentSequenceIndex = 0;
    
    // Viseme simulation patterns
    this.visemePatterns = {
      vowels: ['viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U'],
      consonants: ['viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD', 'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR'],
      silence: ['viseme_sil']
    };

    // Enhanced phoneme to viseme mapping
    this.phonemeMap = {
      // Vowels
      'a': 'viseme_aa', 'e': 'viseme_E', 'i': 'viseme_I', 'o': 'viseme_O', 'u': 'viseme_U',
      'y': 'viseme_I', // Y as vowel
      
      // Bilabials (lips together)
      'p': 'viseme_PP', 'b': 'viseme_PP', 'm': 'viseme_PP',
      
      // Labiodentals (lip to teeth)
      'f': 'viseme_FF', 'v': 'viseme_FF',
      
      // Dentals/Alveolars (tongue to teeth/ridge)
      't': 'viseme_DD', 'd': 'viseme_DD', 'n': 'viseme_DD', 'l': 'viseme_DD',
      
      // Sibilants (hissing sounds)
      's': 'viseme_SS', 'z': 'viseme_SS', 'sh': 'viseme_SS', 'zh': 'viseme_SS',
      
      // Velars/Gutturals (back of tongue)
      'k': 'viseme_kk', 'g': 'viseme_kk', 'ng': 'viseme_kk',
      
      // Affricates and palatals
      'ch': 'viseme_CH', 'j': 'viseme_CH',
      
      // Fricatives and approximants
      'th': 'viseme_TH', 'dh': 'viseme_TH',
      'r': 'viseme_RR', 'w': 'viseme_U', 'h': 'viseme_sil'
    };

    this.init();
  }

  async init() {
    return new Promise((resolve) => {
      const loadVoices = () => {
        this.voices = this.synth.getVoices();
        if (this.voices.length > 0) {
          this.isInitialized = true;
          resolve();
        }
      };

      loadVoices();
      this.synth.addEventListener('voiceschanged', loadVoices);
      
      // Ensure speech synthesis is working
      if (this.synth.getVoices().length > 0) {
        this.isInitialized = true;
        resolve();
      }
    });
  }

  getVoices() {
    const englishVoices = this.voices.filter(voice => voice.lang.startsWith('en'));
    
    // Separate female and other voices
    const femaleVoices = [];
    const otherVoices = [];
    
    const femaleKeywords = [
      'samantha', 'emma', 'aria', 'jenny', 'nova', 'alloy', 'zira', 'susan', 'hazel',
      'female', 'woman', 'girl', 'karen', 'linda', 'helena', 'catherine', 'fiona', 'serena'
    ];
    
    englishVoices.forEach(voice => {
      const voiceName = voice.name.toLowerCase();
      const isFemale = femaleKeywords.some(keyword => voiceName.includes(keyword)) ||
                      (!voiceName.includes('male') && !voiceName.includes('man') && 
                       !voiceName.includes('boy') && !voiceName.includes('david') &&
                       !voiceName.includes('mark') && !voiceName.includes('daniel') &&
                       !voiceName.includes('george'));
      
      if (isFemale) {
        femaleVoices.push(voice);
      } else {
        otherVoices.push(voice);
      }
    });
    
    // Return female voices first, then others
    return [...femaleVoices, ...otherVoices];
  }

  // Improved queue processing with better error handling and explicit clearing
  async processQueue() {
    if (this.isProcessingQueue || this.speechQueue.length === 0) {
      console.log('Queue processing skipped - isProcessing:', this.isProcessingQueue, 'queueLength:', this.speechQueue.length);
      return;
    }

    console.log('Starting queue processing with', this.speechQueue.length, 'items');
    this.isProcessingQueue = true;

    try {
      while (this.speechQueue.length > 0) {
        const { text, options, resolve, reject } = this.speechQueue.shift();
        
        try {
          // Check for abort signal before processing
          if (options.abortSignal && options.abortSignal.aborted) {
            console.log('Queue processing aborted for text:', text.substring(0, 50) + '...');
            reject(new Error('Speech aborted'));
            continue;
          }
          
          console.log('Processing queue item:', text.substring(0, 50) + '...', 'Remaining items:', this.speechQueue.length);
          
          // Small delay between chunks for natural speech flow
          if (this.speechQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          await this.speakImmediately(text, options);
          console.log('Successfully processed queue item:', text.substring(0, 50) + '...');
          resolve();
        } catch (error) {
          console.error('Queue speech error for text:', text.substring(0, 50) + '...', error);
          reject(error);
        }
      }
    } finally {
      this.isProcessingQueue = false;
      // Clear queue after processing to prevent buildup
      this.speechQueue = [];
      console.log('Queue processing completed');
    }
  }

  // Add text to speech queue for streaming with better deduplication
  queueSpeech(text, options = {}) {
    return new Promise((resolve, reject) => {
      const cleanText = text.trim();
      if (!cleanText) {
        resolve();
        return;
      }
      
      // Check for abort signal immediately
      if (options.abortSignal && options.abortSignal.aborted) {
        console.log('Speech queuing aborted for text:', cleanText.substring(0, 50) + '...');
        reject(new Error('Speech aborted'));
        return;
      }
      
      // Improved duplicate check: use a hash or unique ID for chunks
      const textHash = btoa(cleanText); // Simple base64 hash for uniqueness
      const isDuplicate = this.speechQueue.some(item => btoa(item.text.trim()) === textHash);
      if (isDuplicate) {
        console.log('Skipping duplicate text in queue:', cleanText.substring(0, 50) + '...');
        resolve(); // Skip if already in queue
        return;
      }
      
      console.log('Adding to speech queue:', cleanText.substring(0, 50) + '...', 'Queue length:', this.speechQueue.length + 1);
      this.speechQueue.push({ text: cleanText, options, resolve, reject });
      this.processQueue();
    });
  }

  // Get queue status for debugging
  getQueueStatus() {
    return {
      queueLength: this.speechQueue.length,
      isProcessing: this.isProcessingQueue,
      isSpeaking: this.synth.speaking,
      isActive: this.isActive
    };
  }

  // Test method to verify queue functionality
  async testQueueFunctionality() {
    console.log('Testing speech queue functionality...');
    
    const testController = new AbortController();
    const testTexts = [
      'This is the first test sentence.',
      'This is the second test sentence.',
      'This is the third test sentence.'
    ];
    
    try {
      // Add texts to queue
      const promises = testTexts.map((text, index) => 
        this.queueSpeech(text, { 
          abortSignal: testController.signal,
          rate: 0.9 
        })
      );
      
      // Wait a bit then abort
      setTimeout(() => {
        console.log('Aborting test queue...');
        testController.abort();
      }, 1000);
      
      await Promise.all(promises);
      console.log('Queue test completed successfully');
    } catch (error) {
      console.log('Queue test aborted as expected:', error.message);
    }
  }

  // Check if queue is currently processing
  isQueueProcessing() {
    return this.isProcessingQueue;
  }
  

  // Enhanced immediate speech with better timing and sync
  async speakImmediately(text, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    const cleanText = text.trim();
    if (!cleanText) return Promise.resolve();

    return new Promise((resolve, reject) => {
      // Check for abort signal immediately
      if (options.abortSignal && options.abortSignal.aborted) {
        console.log('Speech aborted before starting for text:', cleanText.substring(0, 50) + '...');
        reject(new Error('Speech aborted'));
        return;
      }

      const startSpeech = () => {
        // Cancel any existing animation
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Get voice settings from context or localStorage
        const voiceSettings = getVoiceSettings();
        
        // Configure voice options with settings and optimized settings for better sync
        const defaultOptions = {
          rate: voiceSettings.speed || 0.85, // Use settings speed or default slower rate
          pitch: 1,
          volume: voiceSettings.volume || 0.8, // Use settings volume
          voice: null
        };
        
        const config = { ...defaultOptions, ...options };
        
        utterance.rate = config.rate;
        utterance.pitch = config.pitch;
        utterance.volume = config.volume;
        
        // Select best female voice by default, respecting user preferences
        if (config.voice) {
          utterance.voice = config.voice;
        } else {
          // Priority order for female voices (including OpenAI TTS voices)
          const femaleVoiceNames = [
            'alloy', 'nova', 'shimmer', // OpenAI TTS female voices
            'Samantha', 'Emma', 'Aria', 'Jenny', 'Zira', 'Susan', 'Hazel',
            'Female', 'Woman', 'Girl', 'Feminine'
          ];
          
          // First try to find the user's preferred voice if it's female
          if (voiceSettings.voice && voiceSettings.voice !== 'alloy') {
            const preferredVoice = this.voices.find(voice => 
              voice.name.toLowerCase().includes(voiceSettings.voice.toLowerCase()) &&
              voice.lang.startsWith(voiceSettings.language?.substring(0, 2) || 'en')
            );
            if (preferredVoice) {
              utterance.voice = preferredVoice;
              console.log('Using preferred voice:', preferredVoice.name);
            }
          }
          
          // If no preferred voice found, select best female voice
          if (!utterance.voice) {
            let selectedVoice = null;
            for (const femaleName of femaleVoiceNames) {
              selectedVoice = this.voices.find(voice => 
                voice.lang.startsWith(voiceSettings.language?.substring(0, 2) || 'en') && 
                voice.name.toLowerCase().includes(femaleName.toLowerCase())
              );
              if (selectedVoice) break;
            }
            
            // Fallback: filter by common patterns for female voices
            if (!selectedVoice) {
              const femaleVoices = this.voices.filter(voice => 
                voice.lang.startsWith(voiceSettings.language?.substring(0, 2) || 'en') && 
                (voice.name.toLowerCase().includes('female') ||
                 voice.name.toLowerCase().includes('woman') ||
                 voice.name.toLowerCase().includes('girl') ||
                 voice.name.toLowerCase().includes('karen') ||
                 voice.name.toLowerCase().includes('linda') ||
                 voice.name.toLowerCase().includes('helena') ||
                 voice.name.toLowerCase().includes('catherine') ||
                 voice.name.toLowerCase().includes('fiona') ||
                 voice.name.toLowerCase().includes('serena'))
              );
              if (femaleVoices.length > 0) {
                selectedVoice = femaleVoices[0];
              }
            }
            
            // Ultimate fallback: use any voice that doesn't sound obviously male
            if (!selectedVoice) {
              const nonMaleVoices = this.voices.filter(voice => 
                voice.lang.startsWith(voiceSettings.language?.substring(0, 2) || 'en') && 
                !voice.name.toLowerCase().includes('male') &&
                !voice.name.toLowerCase().includes('man') &&
                !voice.name.toLowerCase().includes('boy') &&
                !voice.name.toLowerCase().includes('david') &&
                !voice.name.toLowerCase().includes('mark') &&
                !voice.name.toLowerCase().includes('daniel') &&
                !voice.name.toLowerCase().includes('george')
              );
              if (nonMaleVoices.length > 0) {
                selectedVoice = nonMaleVoices[0];
              }
            }
            
            if (selectedVoice) {
              utterance.voice = selectedVoice;
              console.log('Selected female voice for AI response:', selectedVoice.name);
            }
          }
        }

        // Set up abort signal listener
        let abortListener = null;
        if (options.abortSignal) {
          abortListener = () => {
            console.log('Speech aborted during execution for text:', cleanText.substring(0, 50) + '...');
            this.synth.cancel();
            this.stopVisemeAnimation();
            reject(new Error('Speech aborted'));
          };
          options.abortSignal.addEventListener('abort', abortListener);
        }

        utterance.onstart = () => {
          this.speechStartTime = performance.now();
          this.startPreciseVisemeAnimation(cleanText, config.rate || 0.85);
          
          // Set speaking state in lipsyncManager
          if (lipsyncManager) {
            lipsyncManager.state = "speaking";
          }
        };

        utterance.onend = () => {
          // Remove abort listener
          if (abortListener && options.abortSignal) {
            options.abortSignal.removeEventListener('abort', abortListener);
          }
          
          this.stopVisemeAnimation();
          this.currentUtterance = null;
          this.speechStartTime = null;
          
          // Reset speaking state in lipsyncManager
          if (lipsyncManager) {
            lipsyncManager.state = "idle";
          }
          
          resolve();
        };

        utterance.onerror = (event) => {
          // Remove abort listener
          if (abortListener && options.abortSignal) {
            options.abortSignal.removeEventListener('abort', abortListener);
          }
          
          // Handle interruption errors more gracefully
          if (event.error === 'interrupted') {
            console.log('Speech interrupted (likely due to new speech starting):', cleanText.substring(0, 50) + '...');
          } else {
            console.error('Speech synthesis error:', event);
          }
          
          this.stopVisemeAnimation();
          this.currentUtterance = null;
          this.speechStartTime = null;
          
          // Reset speaking state in lipsyncManager
          if (lipsyncManager) {
            lipsyncManager.state = "idle";
          }
          
          // Don't reject for interruption errors in streaming mode
          if (event.error === 'interrupted' && options.isStreaming) {
            resolve();
          } else {
            reject(event);
          }
        };

        // Enhanced boundary events for real-time sync
        utterance.onboundary = (event) => {
          if (event.name === 'word' && event.charIndex !== undefined) {
            const currentWord = cleanText.substring(event.charIndex).split(/\s+/)[0];
            this.updateVisemeForWordRealtime(currentWord);
          }
        };

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
      };

      // Cancel any existing speech to prevent interruption errors
      if (this.synth.speaking) {
        this.synth.cancel();
        // Give a small delay to ensure cancellation is complete
        setTimeout(() => startSpeech(), 50);
      } else {
        startSpeech();
      }
    });
  }

  // Precise viseme animation using RequestAnimationFrame for smooth timing
  startPreciseVisemeAnimation(text, speechRate = 0.85) {
    if (!lipsyncManager) return;

    this.currentVisemeSequence = this.analyzeTextForVisemes(text, speechRate);
    this.currentSequenceIndex = 0;
    this.isActive = true;

    const animateWithRAF = () => {
      if (!this.isActive || !this.speechStartTime) return;

      const elapsedTime = performance.now() - this.speechStartTime;
      
      // Find the current viseme based on elapsed time
      let cumulativeTime = 0;
      let currentViseme = 'viseme_sil';

      for (let i = 0; i < this.currentVisemeSequence.length; i++) {
        const { viseme, duration } = this.currentVisemeSequence[i];
        
        if (elapsedTime >= cumulativeTime && elapsedTime < cumulativeTime + duration) {
          currentViseme = viseme;
          break;
        }
        
        cumulativeTime += duration;
      }

      // Set the viseme
      this.setViseme(currentViseme);

      // Continue animation
      if (this.isActive) {
        this.animationFrameId = requestAnimationFrame(animateWithRAF);
      }
    };

    this.animationFrameId = requestAnimationFrame(animateWithRAF);
  }

  // Enhanced phonetic analysis with improved timing accuracy
  analyzeTextForVisemes(text, speechRate = 0.85) {
    const words = text.toLowerCase().split(/\s+/);
    const visemeSequence = [];
    
    // Calculate timing based on speech rate (slower rate = longer durations)
    const speedMultiplier = 1 / speechRate;
    const baseVowelDuration = 140 * speedMultiplier;
    const baseConsonantDuration = 90 * speedMultiplier;
    const baseSilenceDuration = 70 * speedMultiplier;

    words.forEach((word, wordIndex) => {
      if (wordIndex > 0) {
        // Add brief silence between words
        visemeSequence.push({ 
          viseme: 'viseme_sil', 
          duration: baseSilenceDuration * 0.6 
        });
      }

      // Process each character/phoneme
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const nextChar = word[i + 1];
        let viseme = 'viseme_sil';
        let duration = baseConsonantDuration;

        // Handle digraphs (two-letter combinations) first
        if (i < word.length - 1) {
          const digraph = char + nextChar;
          if (this.phonemeMap[digraph]) {
            viseme = this.phonemeMap[digraph];
            duration = baseConsonantDuration;
            i++; // Skip next character
          } else if (this.phonemeMap[char]) {
            viseme = this.phonemeMap[char];
            duration = ['a', 'e', 'i', 'o', 'u', 'y'].includes(char) ? baseVowelDuration : baseConsonantDuration;
          }
        } else if (this.phonemeMap[char]) {
          viseme = this.phonemeMap[char];
          duration = ['a', 'e', 'i', 'o', 'u', 'y'].includes(char) ? baseVowelDuration : baseConsonantDuration;
        }

        // Add slight randomness for natural feel
        const variance = duration * 0.08;
        duration += (Math.random() - 0.5) * variance;

        // Ensure minimum duration
        duration = Math.max(50, duration);

        visemeSequence.push({ viseme, duration });
      }
    });

    return visemeSequence;
  }

  // Real-time viseme update for word boundaries
  updateVisemeForWordRealtime(word) {
    if (!lipsyncManager || !word) return;
    
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!cleanWord) return;

    // Get dominant phoneme in the word for immediate visual feedback
    const dominantPhoneme = this.getDominantPhoneme(cleanWord);
    const viseme = this.phonemeMap[dominantPhoneme] || 'viseme_sil';
    
    this.setViseme(viseme);
  }

  // Get the most prominent phoneme in a word
  getDominantPhoneme(word) {
    // Priority: vowels first (most visible), then prominent consonants
    const vowels = word.match(/[aeiou]/g);
    if (vowels && vowels.length > 0) {
      return vowels[0]; // Return first vowel
    }

    // Look for visually prominent consonants
    const prominentConsonants = ['p', 'b', 'm', 'f', 'v', 'th', 'ch', 'sh'];
    for (const consonant of prominentConsonants) {
      if (word.includes(consonant)) {
        return consonant;
      }
    }

    // Fallback to first consonant
    const consonant = word.match(/[bcdfghjklmnpqrstvwxyz]/);
    return consonant ? consonant[0] : 'sil';
  }

  // Utility method to set viseme safely
  setViseme(viseme) {
    if (lipsyncManager) {
      try {
        if (lipsyncManager.setViseme) {
          lipsyncManager.setViseme(viseme);
        } else {
          lipsyncManager.viseme = viseme;
        }
      } catch (error) {
        console.warn('Failed to set viseme:', error);
      }
    }
  }

  // Enhanced method with precise timing
  async speakWithLipsync(text, options = {}) {
    const cleanText = text.trim();
    if (!cleanText) return Promise.resolve();
    
    // Check for abort signal immediately
    if (options.abortSignal && options.abortSignal.aborted) {
      console.log('Speech with lipsync aborted before starting for text:', cleanText.substring(0, 50) + '...');
      return Promise.reject(new Error('Speech aborted'));
    }
    
    // Add streaming flag to options for better error handling
    const enhancedOptions = { ...options, isStreaming: true };
    
    // For streaming, use queue system
    if (options.useQueue === true) {
      return this.queueSpeech(cleanText, enhancedOptions);
    }
    
    // For immediate speech, stop current speech first
    if (this.synth.speaking) {
      this.synth.cancel();
      // Small delay to ensure cancellation is complete
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return this.speakImmediately(cleanText, enhancedOptions);
  }

  stopVisemeAnimation() {
    this.isActive = false;
    
    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Reset to neutral state
    this.setViseme('viseme_sil');
    
    // Reset speaking state in lipsyncManager
    if (lipsyncManager) {
      lipsyncManager.state = "idle";
    }
    
    // Clear sequence data
    this.currentVisemeSequence = [];
    this.currentSequenceIndex = 0;
    this.speechStartTime = null;
  }

  stop() {
    // Use emergency stop for maximum effectiveness
    this.emergencyStop();
  }

  // Emergency stop - nuclear option to kill all audio
  emergencyStop() {
    console.log('Emergency stop activated - killing all audio');
    
    // Multiple attempts to stop speech synthesis
    try {
      this.synth.cancel();
      this.synth.cancel(); // Call twice for stubborn browsers
      
      // Reset the speech synthesis completely
      if (typeof this.synth.getVoices === 'function') {
        this.synth.getVoices(); // Force refresh
      }
    } catch (error) {
      console.warn('Error in emergency speech stop:', error);
    }
    
    // Force stop any timers or intervals that might be running
    this.stopVisemeAnimation();
    
    // Clear all queues and states with proper abort handling
    this.clearQueueWithAbort();
    this.isActive = false;
    this.currentUtterance = null;
    this.speechStartTime = null;
    
    // Reset animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    // Force reset lipsync manager
    if (lipsyncManager) {
      lipsyncManager.state = "idle";
      lipsyncManager.viseme = "viseme_sil";
    }
    
    // Try to stop any Web Audio API contexts that might be running
    try {
      // Removed problematic AudioContext.prototype.state access to avoid Illegal invocation error
      // If you have references to created AudioContext instances, close or suspend them here
    } catch (error) {
      console.warn('Error handling audio contexts:', error);
    }
    
    console.log('Emergency stop completed');
  }

  // Clear queue with proper abort handling
  clearQueueWithAbort() {
    console.log('Clearing speech queue with abort handling...');
    
    // Reject all pending queue items with abort error
    while (this.speechQueue.length > 0) {
      const { text, reject } = this.speechQueue.shift();
      console.log('Aborting queued speech:', text.substring(0, 50) + '...');
      reject(new Error('Speech queue cleared'));
    }
    
    this.isProcessingQueue = false;
    console.log('Speech queue cleared');
  }

  stopQueue() {
    this.clearQueueWithAbort();
  }

  pause() {
    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.isActive = false;
    }
  }

  resume() {
    if (this.synth.paused) {
      this.synth.resume();
      this.isActive = true;
    }
  }

  isSpeaking() {
    return this.synth.speaking;
  }

  isPaused() {
    return this.synth.paused;
  }
}

export const lipsyncTTSService = new LipsyncTTSService();
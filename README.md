# LotusAi - AI Avatar Chat with Voice Interaction

A React Three Fiber project featuring a 3D avatar with lipsync capabilities, voice recognition, and an integrated Gemini AI chat interface.

## Features

- 🎭 **3D Avatar with Lipsync Animation** - Realistic mouth movements synchronized with speech
- 🤖 **Gemini AI Chat Interface** - Streaming responses with conversational AI
- � **Voice Recognition** - Hands-free interaction with wake word detection ("Hi Lotus")
- 🗣️ **Text-to-Speech with Lipsync** - AI responses are spoken aloud with synchronized lip movements
- 🎨 **Modern UI** - Beautiful gradient interface with Tailwind CSS
- ⚡ **Real-time Processing** - Instant voice recognition and TTS integration
- � **Conversation Mode** - Continuous voice interaction with automatic wake word detection
- 📱 **Minimizable Chat Interface** - Expandable chat window with persistent state

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure Gemini AI:**
   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a `.env` file in the root directory
   - Add your API key:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Start the development server:**
```bash
npm run dev
```

4. **Enable microphone permissions** when prompted by your browser for voice features to work.

## Usage

LotusAi provides an intuitive chat interface with both text and voice interaction capabilities:

### 🗣️ Voice Interaction

- **Wake Word**: Say "Hi Lotus" to activate voice recognition
- **Continuous Listening**: The system listens for the wake word and activates when detected
- **Conversation Mode**: Toggle continuous conversation mode for hands-free interaction
- **Deactivation**: Say "Thanks Lotus" to deactivate or let the system timeout after 30 seconds of inactivity

### 💬 Text Chat

- **Type Messages**: Click the chat area to expand and type your messages
- **Auto-Speech**: AI responses are automatically spoken with lip sync animation
- **Message History**: Full conversation history is maintained
- **Markdown Support**: AI responses support formatting (converted to speech-friendly text for TTS)

## 🚀 Getting Started

### Basic Interaction

1. **Open the application** in your browser
2. **Allow microphone access** when prompted
3. **Say "Hi Lotus"** to activate voice recognition
4. **Ask a question** or have a conversation
5. **Watch the avatar** respond with synchronized lip movements

### Voice Commands

- **"Hi Lotus"** - Activates the system for voice input
- **"Thanks Lotus"** - Deactivates the system
- **Toggle conversation mode** - Use the button to enable continuous listening

### Example Interactions

- "Hi Lotus, what's the weather like?"
- "Hi Lotus, tell me about artificial intelligence"
- "Hi Lotus, explain quantum computing"
- "Hi Lotus, write a short poem"

### Interface Controls

- **Chat Minimize/Maximize**: Click the chat area to expand or minimize
- **Microphone Toggle**: Enable/disable continuous microphone listening
- **Auto-Speak**: Toggle automatic speech for AI responses
- **Stop Speech**: Interrupt current speech output

## 🎭 Lip Sync Technology

The avatar features advanced lip synchronization:

- **Phonetic Analysis**: Text is analyzed to generate appropriate mouth shapes (visemes)
- **Real-time Animation**: Smooth transitions between lip positions
- **Multiple Viseme Types**: Support for vowels, consonants, and silence states
- **Synchronized Timing**: Mouth movements perfectly match speech audio
- **Wawa Lipsync Integration**: Uses the Wawa Lipsync library for accurate mouth animation

## Technologies Used

- **React 19** - Modern React with latest features
- **Three.js / React Three Fiber** - 3D graphics and avatar rendering
- **Tailwind CSS 4.0** - Modern styling with utility classes
- **Vite 6.2** - Fast development build tool
- **Google Gemini 2.0 Flash** - AI model for conversational responses
- **Zustand 5.0** - Lightweight state management
- **Wawa Lipsync** - Advanced lip synchronization library
- **Wawa VFX** - Visual effects for enhanced avatar experience
- **Web Speech API** - Browser native speech recognition and synthesis

## Project Structure

```
src/
├── components/
│   ├── UI.jsx              # Main UI layout and state management
│   ├── ChatInterface.jsx   # Chat interface with voice controls
│   ├── Experience.jsx      # 3D scene setup
│   ├── Avatar.jsx          # 3D avatar component
│   └── Avatar2.jsx         # Alternative avatar component
├── services/
│   ├── geminiService.js           # Gemini AI API integration
│   ├── lipsyncTTSService.js       # Text-to-speech with lip sync
│   ├── speechRecognitionService.js # Voice recognition with wake words
│   ├── conversationService.js     # Conversation state management
│   └── streamingSpeechService.js  # Streaming speech processing
└── utils/                  # Utility functions and helpers
```

## 🔧 Troubleshooting

### Common Issues

**Voice Recognition Not Working:**
- Ensure microphone permissions are granted in your browser
- Check that your browser supports the Web Speech API (Chrome, Edge, Safari)
- Make sure you're using HTTPS (required for microphone access)
- Try saying "Hi Lotus" clearly to activate the system

**AI Chat Not Responding:**
- Verify that `VITE_GEMINI_API_KEY` is set correctly in your `.env` file
- Check that your API key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Look for error messages in the browser console
- Ensure you have internet connectivity

**Text-to-Speech Not Working:**
- Check that your browser supports the Web Speech API
- Verify that system voices are available
- Try refreshing the page to reload the voice list
- Ensure audio isn't muted in your browser

**Avatar Not Displaying:**
- Ensure WebGL is enabled in your browser
- Check that 3D models are loading properly
- Verify that the browser supports modern JavaScript features
- Try refreshing the page or clearing browser cache

**Lip Sync Issues:**
- Make sure the Wawa Lipsync library is properly loaded
- Check that audio and viseme data are being processed
- Verify that the avatar model supports lip sync animations
- Try different text inputs to test the system

### Performance Tips

- **Use Chrome or Edge** for best performance and feature support
- **Enable hardware acceleration** in your browser settings
- **Close other tabs** to free up memory for 3D rendering
- **Use a stable internet connection** for smooth AI responses

### Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Voice Recognition | ✅ | ✅ | ❌ | ✅ |
| Text-to-Speech | ✅ | ✅ | ✅ | ✅ |
| WebGL/3D Graphics | ✅ | ✅ | ✅ | ✅ |
| Web Audio API | ✅ | ✅ | ✅ | ✅ |

**Recommended**: Chrome 80+ or Edge 80+ for full feature support

## 🏗️ Development

### Getting Started with Development

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Set up environment variables**: Create `.env` with your Gemini API key
4. **Start development server**: `npm run dev`
5. **Open browser**: Navigate to `http://localhost:5173`

### Key Services

- **`geminiService.js`** - Handles AI chat interactions with Gemini 2.0 Flash
- **`lipsyncTTSService.js`** - Manages text-to-speech with lip sync animation
- **`speechRecognitionService.js`** - Processes voice input with wake word detection
- **`conversationService.js`** - Manages conversation state and history

### Architecture

- **Frontend**: React 19 with modern hooks and concurrent features
- **3D Rendering**: Three.js with React Three Fiber for declarative 3D
- **AI Integration**: Direct REST API calls to Gemini 2.0 Flash
- **Voice Processing**: Web Speech API for recognition and synthesis
- **State Management**: Zustand for efficient state handling
- **Styling**: Tailwind CSS 4.0 with utility-first approach

### Testing Files

The project includes several test files for development:

- `test-streaming-tts.html` - Test streaming text-to-speech
- `test-speech-queue.html` - Test speech queue management
- `test-instant-speech.html` - Test instant speech synthesis
- `test-full-response-tts.html` - Test full response TTS
- `test-streaming-speech.html` - Test streaming speech recognition

### Build Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## 📄 License

This project is part of the LotusAi system and is proprietary software.

## 🤝 Contributing

This is a private project. Please contact the development team for contribution guidelines.

---

**LotusAi** - Bringing AI conversations to life with natural voice interaction and 3D avatar technology.

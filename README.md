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


LotusAi provides an intuitive chat interface with both text and voice interaction capabilities. Below is a detailed explanation of the implementation and usage of all major components and services in the project.

---

## 🛠️ Implementation Details

### Main Components

- **`App.jsx`**: Entry point for the app. Sets up routing, initializes the global lipsync manager, and exposes the TTS service globally for use by other modules.
- **`UI.jsx`**: Main UI layout. Handles chat window state, microphone settings, and renders the 3D scene and chat interface.
- **`Experience.jsx`**: Sets up the 3D scene using React Three Fiber, including camera controls, lighting, background effects, and the avatar.
- **`Avatar.jsx`**: Loads and animates the 3D avatar model. Integrates with the lipsync manager to animate mouth movements in sync with speech and supports facial expressions.
- **`ChatInterface.jsx`**: Manages the chat UI, message history, text/voice input, and interaction with AI and TTS services. Handles markdown-to-speech conversion and streaming responses.
- **`MenuBar.jsx`**: Provides navigation and authentication controls (login/logout/settings) using Firebase Auth.
- **`Login.jsx`**: Handles user authentication (login/register) with Firebase.
- **`Register.jsx`**: (Currently empty) Placeholder for user registration UI.
- **`Settings.jsx`**: (Currently empty) Placeholder for user settings UI.

### Core Services

- **`geminiService.js`**: Integrates with Google Gemini 2.0 Flash API for AI chat. Supports both standard and streaming responses, with system prompt/context support. Requires `VITE_GEMINI_API_KEY` in `.env`.
- **`lipsyncTTSService.js`**: Manages text-to-speech using the Web Speech API and synchronizes mouth movements (visemes) on the avatar. Supports speech queueing, phoneme-to-viseme mapping, and user voice settings.
- **`speechRecognitionService.js`**: Provides voice recognition using the Web Speech API. Implements wake word detection ("Hi Lotus"), deactivation, inactivity timeout, and manages recognition state and events.
- **`conversationService.js`**: Orchestrates conversation flow, manages conversation mode (continuous listening), voice activity detection (VAD), and coordinates between TTS and STT services.
- **`streamingSpeechService.js`**: Handles streaming speech output for AI responses, chunking long responses and synchronizing with lipsync.
- **`ioIntelService.js`**: Integrates with IO Intelligence API for text summarization and news fetching. Requires `VITE_IOINTELLIGENCE_API_KEY` and `VITE_NEWSAPI_KEY` in `.env`.
- **`firebase.js`**: Initializes Firebase for authentication and analytics. Requires Firebase config variables in `.env`.

### 3D Models

- **`public/models/686f742935402afcb99dd966.glb`**: Main avatar 3D model.
- **`public/models/animations.glb`**: Animation data for avatar (idle, talking, etc).

### Key Features Explained

- **Voice Activation**: The app listens for the wake word "Hi Lotus" to activate voice recognition. Deactivation is triggered by "Thanks Lotus" or inactivity.
- **Lipsync**: TTS output is analyzed for phonemes, which are mapped to visemes (mouth shapes) and animated on the avatar in real time.
- **Streaming AI Responses**: Gemini AI responses are streamed and spoken in chunks, allowing for natural, low-latency conversation.
- **Conversation Mode**: When enabled, the app continuously listens for user input and responds, creating a hands-free experience.
- **Authentication**: Users can log in or register using Firebase Auth. MenuBar provides login/logout controls.
- **Settings**: (Planned) User settings for voice, language, and preferences.

---

## 🧩 Usage Scenarios

### 1. Chatting with the AI
- Type or speak your message. The AI responds with both text and spoken output, with the avatar lipsyncing the response.

### 2. Voice-Only Interaction
- Say "Hi Lotus" to activate. Speak your query. The AI responds aloud. Say "Thanks Lotus" or wait for timeout to deactivate.

### 3. Continuous Conversation
- Enable conversation mode for hands-free, ongoing interaction. The app will listen and respond in a loop.

### 4. News Summarization
- Ask for news or summaries. The app fetches and summarizes news using IO Intelligence and NewsAPI.

### 5. Authentication
- Use the login/register UI to create an account or sign in. Auth state is managed via Firebase.

---

## 🏗️ Project Structure (Expanded)

```
src/
├── components/
│   ├── UI.jsx                # Main UI layout
│   ├── ChatInterface.jsx     # Chat interface, voice/text input, message history
│   ├── Experience.jsx        # 3D scene setup
│   ├── Avatar.jsx            # 3D avatar, lipsync, facial animation
│   ├── Login.jsx             # Login/register UI (Firebase)
│   ├── Register.jsx          # (Planned) Registration UI
│   ├── Settings.jsx          # (Planned) User settings
│   └── layout/
│       ├── MenuBar.jsx       # Navigation, auth controls
│       └── HambergerIcon.jsx # Menu icon
├── services/
│   ├── geminiService.js           # Gemini AI API integration
│   ├── lipsyncTTSService.js       # TTS with lipsync
│   ├── speechRecognitionService.js# Voice recognition, wake word
│   ├── conversationService.js     # Conversation mode, VAD
│   ├── streamingSpeechService.js  # Streaming speech output
│   ├── ioIntelService.js          # News/summarization APIs
│   └── firebase.js                # Firebase auth/analytics
├── App.jsx                   # App entry, routing, global managers
├── index.css                 # Global styles (Tailwind)
├── main.jsx                  # React entry point
└── assets/                   # Static assets
```

---

## 🔑 Environment Variables

Create a `.env` file in the root with the following (replace with your keys):

```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_IOINTELLIGENCE_API_KEY=your_io_intel_key
VITE_NEWSAPI_KEY=your_newsapi_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```

---

## 📚 Further Reading

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Wawa Lipsync](https://github.com/wawawario/wawa-lipsync)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)
- [Firebase Auth](https://firebase.google.com/docs/auth)

---

For any questions or contributions, please contact the development team.

**LotusAi** - Bringing AI conversations to life with natural voice interaction and 3D avatar technology.

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

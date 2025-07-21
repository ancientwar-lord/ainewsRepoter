# LotusAi - AI Avatar Chat with Voice Interaction

A React Three Fiber project featuring a 3D avatar with lipsync capabilities, voice recognition, and integrated IO Intelligence AI Agent & Gemini AI.

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

2. **Configure API Keys:**
   - Create a `.env` file in the root directory and copy all env variables from the .env.sample
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


- **`geminiService.js`**: Integrates with Google Gemini 2.0 Flash API for AI chat. Supports both standard and streaming responses, with system prompt/context support. Requires `VITE_GEMINI_API_KEY` in `.env`.
- **`lipsyncTTSService.js`**: Manages text-to-speech using the Web Speech API and synchronizes mouth movements (visemes) on the avatar. Supports speech queueing, phoneme-to-viseme mapping, and user voice settings.
- **`speechRecognitionService.js`**: Provides voice recognition using the Web Speech API. Implements wake word detection ("Hi Lotus"), deactivation, inactivity timeout, and manages recognition state and events.
- **`conversationService.js`**: Orchestrates conversation flow, manages conversation mode (continuous listening), voice activity detection (VAD), and coordinates between TTS and STT services.
- **`streamingSpeechService.js`**: Handles streaming speech output for AI responses, chunking long responses and synchronizing with lipsync.
- **`ioIntelService.js`**: Integrates with IO Intelligence AI Agent API for text summarization and news fetching. Requires `VITE_IOINTELLIGENCE_API_KEY` and `VITE_NEWSAPI_KEY` in `.env`.
- **`firebase.js`**: Initializes Firebase for authentication and analytics. Requires Firebase config variables in `.env`.


### Key Features Explained

- **Voice Activation**: The app listens for the wake word "Hi Lotus" to activate voice recognition. Deactivation is triggered by "Thanks Lotus" or inactivity.

- **Lipsync**: TTS output is analyzed for phonemes, which are mapped to visemes (mouth shapes) and animated on the avatar in real time.
- **Streaming AI Responses**: Gemini AI responses are streamed and spoken in chunks, allowing for natural, low-latency conversation.
- **Conversation Mode**: When enabled, the app continuously listens for user input and responds, creating a hands-free experience.
- **Authentication**: Users can log in or register using Firebase Auth. MenuBar provides login/logout controls.

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

### 5. Authentication(optinal)
- Use the login/register UI to create an account or sign in. Auth state is managed via Firebase.



### 🗣️ Voice Interaction

- **Wake Word**: Say "Hi Lotus" to activate voice recognition
- **Continuous Listening**: The system listens for the wake word and activates when detected
- **Conversation Mode**: Toggle continuous conversation mode for hands-free interaction
- **Deactivation**: Say "Thanks Lotus" to deactivate or let the system timeout after 30 seconds of inactivity

### 💬 Text Chat

- **Type Messages**: Click the chat area to expand and type your messages
- **Auto-Speech**: AI responses are automatically spoken with lip sync animation
- **Message History**: Full conversation history is maintained


### Example Interactions

- "Hi Lotus, what's the weather like?"
- "Hi Lotus, tell me about artificial intelligence"
- "Hi Lotus, explain quantum computing"
- "Hi Lotus, write a short poem"


### Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Voice Recognition | ✅ | ✅ | ❌ | ✅ |
| Text-to-Speech | ✅ | ✅ | ✅ | ✅ |
| WebGL/3D Graphics | ✅ | ✅ | ✅ | ✅ |
| Web Audio API | ✅ | ✅ | ✅ | ✅ |


**LotusAi** - Bringing AI conversations to life with natural voice interaction and 3D avatar technology.

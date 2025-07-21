import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY not found in environment variables");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    // Set a neutral system prompt for natural conversation flow
    this.systemPrompt = 'You are a helpful and neutral AI assistant. Respond naturally and helpfully to user queries.';
  }

  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
  }

  async generateResponse(message) {
    try {
      if (!API_KEY) {
        throw new Error("API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.");
      }

      const result = await this.model.generateContent(message);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating response:", error);
      throw error;
    }
  }

  async generateStreamingResponse(message, onChunk, context = [], options = {}) {
    try {
      if (!API_KEY) {
        throw new Error("API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.");
      }
      // Compose context with system prompt if set, using Gemini's expected format
      let messages = [];
      if (this.systemPrompt) {
        messages.push({ text: this.systemPrompt });
      }
      if (Array.isArray(context) && context.length > 0) {
        // Convert all context messages to Gemini format if not already
        messages = messages.concat(
          context.map(msg =>
            msg && typeof msg.text === 'string'
              ? { text: msg.text }
              : msg && typeof msg.content === 'string'
                ? { text: msg.content }
                : { text: String(msg) }
          )
        );
      }
      // Add the user message
      messages.push({ text: message });
      // Use the Gemini API's content stream with context
      const result = await this.model.generateContentStream(messages, options);
      let fullResponse = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        onChunk(chunkText, fullResponse);
      }
      return fullResponse;
    } catch (error) {
      console.error("Error generating streaming response:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
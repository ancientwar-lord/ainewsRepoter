// src/services/ioChatService.js

const IOINTELLIGENCE_API_KEY = import.meta.env.VITE_IOINTELLIGENCE_API_KEY; // Set this in your .env file
const BASE_URL = "https://api.intelligence.io.solutions/api/v1";

/**
 * Send a chat message to the IO Intelligence API and get a response.
 * @param {Array<{role: string, content: string}>} messages - The conversation history, including system/user/assistant roles.
 * @param {string} [model] - The model ID to use (default: CohereForAI/c4ai-command-r-plus-08-2024).
 * @returns {Promise<string>} - The assistant's reply.
 */
export async function ioChatCompletion(messages, model = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8", options = {}) {
  if (!IOINTELLIGENCE_API_KEY) {
    throw new Error("VITE_IOINTELLIGENCE_API_KEY not found in environment variables");
  }
  const body = {
    model,
    messages,
    reasoning_content: true,
    temperature: 0.7,
    ...options
  };
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${IOINTELLIGENCE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`IO API Error: ${response.status}`);
  }
  const data = await response.json();
  // Extract the assistant's reply from the response
  const choice = data.choices && data.choices[0];
  if (choice && choice.message && choice.message.content) {
    return choice.message.content;
  }
  throw new Error("No valid response from IO API");
}

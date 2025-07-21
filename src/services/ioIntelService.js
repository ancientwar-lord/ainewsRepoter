// src/services/ioIntelService.js

const IOINTELLIGENCE_API_KEY = import.meta.env.VITE_IOINTELLIGENCE_API_KEY; // Set this in your .env file
const BASE_URL = "https://api.intelligence.io.solutions/api/v1";

/**
 * Summarize text using the IO Intelligence API.
 * @param {string} text - The text to summarize.
 * @param {string} agentId - The agent ID or name (e.g., 'summary_agent').
 * @param {number} maxWords - Maximum number of words in the summary.
 * @returns {Promise<object>} - The API response.
 */
async function summarizeText(text, agentId = "summary_agent", maxWords = 100) {
  const response = await fetch(`${BASE_URL}/workflows/run`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${IOINTELLIGENCE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: text,
      agent_names: [agentId],
      args: { type: "summarize_text", max_words: maxWords }
    })
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  return response.json();
}



/**
 * Fetch and summarize news articles. If a keyword is provided, fetch topic-based news using /v2/everything.
 * Otherwise, fetch top headlines. Returns a summary string.
 * @param {string} [keyword] - Optional topic/keyword for news search.
 * @returns {Promise<string>} - The summarized news content.
 */
async function getTodaysNewsSummary(keyword) {
  const NEWS_API_KEY = import.meta.env.VITE_NEWSAPI_KEY;
  let NEWS_API_URL;
  if (keyword && typeof keyword === 'string' && keyword.trim().length > 0) {
    // Use /v2/everything for topic-based news
    const encodedKeyword = encodeURIComponent(keyword.trim());
    // Sort by publishedAt for latest news, limit to English
    NEWS_API_URL = `https://newsapi.org/v2/everything?q=${encodedKeyword}&language=en&sortBy=publishedAt&pageSize=20`;
  } else {
    // Use top-headlines for generic news
    NEWS_API_URL = `https://newsapi.org/v2/top-headlines?language=en&pageSize=20`;
  }
  // Fetch news articles
  const newsResponse = await fetch(NEWS_API_URL, {
    headers: {
      "X-Api-Key": NEWS_API_KEY
    }
  });
  if (!newsResponse.ok) {
    throw new Error(`NewsAPI Error: ${newsResponse.status}`);
  }
  const newsData = await newsResponse.json();
  if (!newsData.articles || newsData.articles.length === 0) {
    throw new Error("No news articles found.");
  }
  // Combine titles and content for summarization
  const combinedText = newsData.articles.map(a => `${a.title}. ${a.content || ''}`).join(' ');
  // Summarize using existing summarizeText
  const summaryResult = await summarizeText(combinedText, "summary_agent", 500);
  // The API response may have different structure; always return a string for React rendering
  if (typeof summaryResult === 'string') return summaryResult;
  if (summaryResult.summary && typeof summaryResult.summary === 'string') return summaryResult.summary;
  if (summaryResult.key_points && Array.isArray(summaryResult.key_points)) {
    return summaryResult.key_points.join('\n');
  }
  // Fallback: stringify for debugging, but warn in UI
  return JSON.stringify(summaryResult);
}

export { summarizeText, getTodaysNewsSummary };

// newsRagService.js
// Handles fetching news, storing in io.net R2R (RAG), retrieving chunks, and generating answers using io.net AI Models API

const NEWS_API_KEY = import.meta.env.VITE_NEWSAPI_KEY;
const IO_API_KEY = import.meta.env.VITE_IOINTELLIGENCE_API_KEY;

const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines?country=us';
const R2R_DOCS_URL = 'https://api.intelligence.io.solutions/api/r2r/v3/documents';



// 1. Fetch news articles from News API
export async function fetchNewsArticles() {
  const res = await fetch(NEWS_API_URL, {
    headers: { 'X-Api-Key': NEWS_API_KEY }
  });
  if (!res.ok) throw new Error('Failed to fetch news articles');
  const data = await res.json();
  console.log('fetchNewsArticles: Fetched articles:', data.articles);
  return data.articles || [];
}

// 2. Store news articles in R2R (RAG) system
// Before storing new articles, delete all previous RAG documents
export async function storeArticlesInRAG(articles) {
  // 2.1 Fetch all previous RAG documents
  const fetchDocsRes = await fetch(R2R_DOCS_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${IO_API_KEY}`
    }
  });
  if (fetchDocsRes.ok) {
    const docsData = await fetchDocsRes.json();
    const prevDocs = docsData.results || [];
    const docIds = prevDocs.map(doc => doc.id);
    console.log('storeArticlesInRAG: Previous document IDs:', docIds);
    // 2.2 Delete each previous document by id
    for (const docId of docIds) {
      if (docId) {
        await fetch(`${R2R_DOCS_URL}/${docId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${IO_API_KEY}`
          }
        });
      }
    }
  }

  // 2.3 Store new articles
  const docIds = [];
  for (const article of articles) {
    const content = article.content || article.description || article.title;
    if (!content) continue;
    const formData = new FormData();
    formData.append('raw_text', article.title);
    formData.append('metadata', JSON.stringify({
      url: article.url
    }));
    formData.append('ingestion_mode', 'hi-res'); // or 'fast'

    const res = await fetch(R2R_DOCS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${IO_API_KEY}`
        // Do NOT set 'Content-Type' here!
      },
      body: formData
    });
    if (res.ok) {
      const data = await res.json();
      if (data.results?.document_id) docIds.push(data.results.document_id);
    }
  }
  return docIds;
}

// 3. Retrieve relevant chunks from RAG for a user question
export async function generateRagChunk(question) {
  const res = await fetch('https://api.intelligence.io.solutions/api/r2r/v3/retrieval/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${IO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: question,
    })
  });
  if (!res.ok) throw new Error('Failed to retrieve relevant chunks');
  const data = await res.json();
  console.log('generateRagChunk: Retrieved chunks:', data.results?.chunk_search_results || []);
  // Chunks are in data.results.chunk_search_results[].text
  return (data.results?.chunk_search_results || []).map(r => r.text || '').filter(Boolean);
}



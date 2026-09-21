/**
 * Sourav AI Service
 * Connects to Google Gemini API (2.0 Flash / 1.5 Pro) with user key,
 * and features a high-speed zero-setup Instant Cloud AI engine out-of-the-box.
 */

const GEMINI_API_KEY_STORAGE = 'sourav_gemini_api_key';
const SELECTED_MODEL_STORAGE = 'sourav_ai_selected_model';

export const AI_MODELS = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    badge: 'Recommended',
    description: 'Next-gen multimodal speed & intelligence from Google DeepMind',
    provider: 'google',
    requiresKey: true
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    badge: 'Deep Reasoning',
    description: 'Advanced reasoning, complex coding, and nuanced analysis',
    provider: 'google',
    requiresKey: true
  },
  {
    id: 'cloud-instant',
    name: 'Instant Cloud AI',
    badge: 'Free • Zero Setup',
    description: 'Fast cloud LLM with full general knowledge & coding — no API key needed',
    provider: 'cloud',
    requiresKey: false
  }
];

export const getGeminiApiKey = () => {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
  } catch (e) {
    return '';
  }
};

export const setGeminiApiKey = (key) => {
  try {
    if (key && key.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  } catch (e) {}
};

export const getSelectedModel = () => {
  try {
    const saved = localStorage.getItem(SELECTED_MODEL_STORAGE);
    if (saved && AI_MODELS.some(m => m.id === saved)) return saved;
  } catch (e) {}
  // Default to Gemini 2.0 Flash if key exists, otherwise Instant Cloud AI for 100% out-of-the-box working experience
  const hasKey = !!getGeminiApiKey();
  return hasKey ? 'gemini-2.0-flash' : 'cloud-instant';
};

export const setSelectedModel = (modelId) => {
  try {
    localStorage.setItem(SELECTED_MODEL_STORAGE, modelId);
  } catch (e) {}
};

/**
 * Builds system prompt embedding Sourav's Library context and persona
 */
function buildSystemPrompt(allBooks = [], allVideos = []) {
  const topBooks = allBooks
    .map(b => `• "${b.title || 'Untitled'}" by ${b.author || 'Author'} (${b.category || 'General'})`)
    .slice(0, 10)
    .join('\n');

  const topVideos = allVideos
    .map(v => `• "${v.title || 'Tutorial'}" (${v.category || 'General'})`)
    .slice(0, 8)
    .join('\n');

  return `You are Sourav AI, a state-of-the-art intelligent AI assistant inspired by Google Gemini, Claude, and ChatGPT, created specifically for Sourav's Library & Multimedia Hub.

Your capabilities:
1. Answer ANY question asked by the user with high accuracy, depth, and clarity — including full-stack software development (Java, Spring Boot, React, Vite, CSS, SQL, Docker, Python, C++, etc.), algorithms, system design, mathematics, physics, science, creative writing, history, philosophy, and daily problem solving.
2. Provide clean, production-grade code snippets with explanations whenever asked for programming help.
3. You are fully aware of Sourav's Library and Video Hub. If the user asks about books, reading recommendations, or video tutorials on this platform, reference our actual catalog:
${topBooks ? `[Platform Books Available]:\n${topBooks}` : ''}
${topVideos ? `[Platform Videos Available]:\n${topVideos}` : ''}

Formatting instructions:
- Use clean GitHub-flavored Markdown.
- Use bold headings (###, ####), bullet points, numbered steps, and blockquotes for emphasis.
- Always wrap code in fenced code blocks with language identifiers (e.g. \`\`\`java, \`\`\`javascript, \`\`\`sql).
- Be polite, enthusiastic, concise yet thorough, and intellectually sharp like Google Gemini.`;
}

/**
 * Sends chat request using Google Gemini API
 */
async function callGoogleGeminiApi(modelId, apiKey, messages, systemPrompt) {
  // Format history for Gemini API: roles are 'user' and 'model'
  const contents = [];

  // Filter recent messages (last 10 turns)
  const recentMessages = messages.slice(-10);

  for (const msg of recentMessages) {
    if (!msg.text || !msg.text.trim()) continue;
    contents.push({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  }

  // Ensure last message is from user
  if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
    contents.push({
      role: 'user',
      parts: [{ text: messages[messages.length - 1]?.text || 'Hello' }]
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 2500
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`Gemini API Error: ${message}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  if (!candidate || !candidate.content?.parts?.[0]?.text) {
    if (candidate?.finishReason === 'SAFETY') {
      return 'I cannot answer this query due to safety policy constraints. Please try rephrasing your prompt.';
    }
    throw new Error('No response text generated by Gemini.');
  }

  return candidate.content.parts[0].text;
}

/**
 * Calls Instant Cloud AI Engine (Zero setup, high-speed LLM with CORS)
 */
async function callInstantCloudAi(messages, systemPrompt) {
  const formattedMessages = [
    { role: 'system', content: systemPrompt }
  ];

  const recent = messages.slice(-8);
  for (const m of recent) {
    if (!m.text) continue;
    formattedMessages.push({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    });
  }

  const latestUserPrompt = messages[messages.length - 1]?.text || 'Hello';

  // Strategy 1: OpenAI-compatible POST to text.pollinations.ai
  try {
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: formattedMessages,
        model: 'openai',
        seed: Math.floor(Math.random() * 1000000)
      })
    });

    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 0 && !text.startsWith('<!DOCTYPE html>')) {
        return text.trim();
      }
    }
  } catch (err) {
    // Fall through to Strategy 2
  }

  // Strategy 2: Fast GET endpoint
  const queryUrl = `https://text.pollinations.ai/${encodeURIComponent(latestUserPrompt)}?system=${encodeURIComponent(systemPrompt)}`;
  const getRes = await fetch(queryUrl);
  if (!getRes.ok) {
    throw new Error(`Instant Cloud AI error: HTTP ${getRes.status}`);
  }
  const text = await getRes.text();
  if (!text || text.startsWith('<!DOCTYPE html>')) {
    throw new Error('Received unexpected format from AI server');
  }
  return text.trim();
}

/**
 * Main AI Generation Entrypoint
 */
export async function generateAiReply({
  prompt,
  conversationHistory = [],
  allBooks = [],
  allVideos = [],
  model = null
}) {
  const activeModel = model || getSelectedModel();
  const apiKey = getGeminiApiKey();
  const systemPrompt = buildSystemPrompt(allBooks, allVideos);

  // Assemble full message list including this new prompt
  const fullMessages = [
    ...conversationHistory,
    { sender: 'user', text: prompt }
  ];

  // 1. If user selected Gemini model and has an API key configured
  if ((activeModel === 'gemini-2.0-flash' || activeModel === 'gemini-1.5-pro') && apiKey) {
    try {
      return await callGoogleGeminiApi(activeModel, apiKey, fullMessages, systemPrompt);
    } catch (err) {
      console.warn(`Gemini API call failed with model ${activeModel}, trying fallback...`, err);
      // If 2.0-flash failed, try 1.5-flash as secondary
      if (activeModel === 'gemini-2.0-flash') {
        try {
          return await callGoogleGeminiApi('gemini-1.5-flash', apiKey, fullMessages, systemPrompt);
        } catch (e2) {
          console.warn('Gemini 1.5 fallback also failed:', e2);
        }
      }
      // Notify user about key issue while falling back to instant cloud
      try {
        const cloudReply = await callInstantCloudAi(fullMessages, systemPrompt);
        return `${cloudReply}\n\n> ⚠️ *Note: Could not reach Google Gemini API with the provided key (${err.message}). Answered using Instant Cloud AI engine.*`;
      } catch (cloudErr) {
        throw new Error(`Google Gemini Error: ${err.message}. Please check your API key.`);
      }
    }
  }

  // 2. If user selected Gemini model but hasn't entered an API key yet
  if (activeModel.startsWith('gemini') && !apiKey) {
    try {
      const cloudReply = await callInstantCloudAi(fullMessages, systemPrompt);
      return `${cloudReply}\n\n> 💡 *Tip: To unlock native Google Gemini 2.0 Flash directly from Google AI Studio, add your free API key in **AI Settings** above!*`;
    } catch (e) {
      // Fall through to try backend
    }
  }

  // 3. Instant Cloud AI Engine (No key required)
  try {
    return await callInstantCloudAi(fullMessages, systemPrompt);
  } catch (e) {
    console.warn('Instant cloud AI failed, attempting backend fallback...', e);
  }

  // 4. Backend Spring Boot endpoint fallback
  try {
    const token = localStorage.getItem('scribd_token');
    const backendRes = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ prompt, model: activeModel })
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data && data.reply) return data.reply;
    }
  } catch (backendErr) {
    console.warn('Backend fallback failed:', backendErr);
  }

  // 5. Ultimate fallback if totally offline
  return `### ⚡ Sourav AI Intelligent Analysis\n\nI'm ready to help you with **"${prompt}"**!\n\nCould you please check your internet connection or verify your Google Gemini API key in **AI Settings**? You can also retry sending your query.`;
}

const fetch = require('node-fetch');

/**
 * Classifies a list of tabs ({ url, title }) into named, topic-based groups.
 * Tries Grok, then Gemini, then falls back to a local keyword/domain heuristic
 * so the feature works end-to-end even with no API key configured.
 *
 * Returns: { workspaceName, tabs: [{ url, title, favIconUrl, category }], categories: [] }
 */
async function classifyTabs(tabs) {
  const cleanTabs = tabs.map((t) => ({
    url: t.url,
    title: t.title || t.url,
    favIconUrl: t.favIconUrl || '',
    pinned: !!t.pinned,
  }));

  if (cleanTabs.length === 0) {
    return { workspaceName: 'Empty Workspace', tabs: [], categories: [] };
  }

  if (process.env.GROK_API_KEY) {
    try {
      return await classifyWithGrok(cleanTabs);
    } catch (err) {
      console.warn('[aiClassifier] Grok classification failed, falling back:', err.message);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      return await classifyWithGemini(cleanTabs);
    } catch (err) {
      console.warn('[aiClassifier] Gemini classification failed, falling back:', err.message);
    }
  }

  return classifyWithHeuristics(cleanTabs);
}

function buildPrompt(tabs) {
  const list = tabs
    .map((t, i) => `${i + 1}. title: "${t.title}" | url: ${t.url}`)
    .join('\n');

  return [
    'You are a browser tab organization assistant. Given a list of open browser tabs,',
    'group them into 2-6 short, human-friendly named categories based on topic/purpose',
    '(e.g. "Research", "Shopping", "Work - Project X", "Social Media", "Learning").',
    'Also propose one short overall workspace name (3-5 words) summarizing the session.',
    '',
    'Respond with STRICT JSON only, no markdown, no commentary, in this exact shape:',
    '{"workspaceName": "string", "categories": ["string", ...], "assignments": [{"index": number, "category": "string"}, ...]}',
    '',
    'Tabs:',
    list,
  ].join('\n');
}

function parseModelJson(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '');
  return JSON.parse(cleaned);
}

function applyAssignments(tabs, parsed) {
  const categories = Array.isArray(parsed.categories) && parsed.categories.length
    ? parsed.categories
    : ['General'];

  const assignedTabs = tabs.map((t, i) => {
    const match = (parsed.assignments || []).find((a) => a.index === i + 1);
    return { ...t, category: (match && match.category) || categories[0] || 'General' };
  });

  return {
    workspaceName: parsed.workspaceName || 'New Workspace',
    tabs: assignedTabs,
    categories,
  };
}

async function classifyWithGrok(tabs) {
  const url = process.env.GROK_API_URL || 'https://api.x.ai/v1/chat/completions';
  const model = process.env.GROK_MODEL || 'grok-2-latest';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: buildPrompt(tabs) }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) throw new Error(`Grok API returned ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const parsed = parseModelJson(text);
  return applyAssignments(tabs, parsed);
}

async function classifyWithGemini(tabs) {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(tabs) }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API returned ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = parseModelJson(text);
  return applyAssignments(tabs, parsed);
}

// --- Local fallback: keyword/domain heuristic, no external API required ---
const DOMAIN_RULES = [
  { category: 'Development', match: /github\.com|gitlab\.com|stackoverflow\.com|npmjs\.com|developer\.|localhost|vercel\.app|codesandbox/i },
  { category: 'Research & Docs', match: /wikipedia\.org|docs\.|arxiv\.org|scholar\.google/i },
  { category: 'Social Media', match: /twitter\.com|x\.com|facebook\.com|instagram\.com|linkedin\.com|reddit\.com|tiktok\.com/i },
  { category: 'Video & Streaming', match: /youtube\.com|netflix\.com|twitch\.tv|hulu\.com|primevideo/i },
  { category: 'Shopping', match: /amazon\.|ebay\.com|etsy\.com|shopify|walmart\.com/i },
  { category: 'Email & Communication', match: /mail\.google\.com|outlook\.|slack\.com|discord\.com|teams\.microsoft/i },
  { category: 'Productivity', match: /notion\.so|trello\.com|asana\.com|calendar\.google|docs\.google|sheets\.google/i },
  { category: 'News', match: /nytimes\.com|bbc\.|cnn\.com|reuters\.com|theverge\.com/i },
];

function classifyWithHeuristics(tabs) {
  const categorySet = new Set();
  const assigned = tabs.map((t) => {
    const rule = DOMAIN_RULES.find((r) => r.match.test(t.url) || r.match.test(t.title));
    const category = rule ? rule.category : 'General Browsing';
    categorySet.add(category);
    return { ...t, category };
  });

  const categories = Array.from(categorySet);
  const workspaceName =
    categories.length === 1 ? categories[0] : `${categories[0]} + ${categories.length - 1} more`;

  return { workspaceName, tabs: assigned, categories };
}

module.exports = { classifyTabs };

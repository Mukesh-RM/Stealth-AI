const log = require('electron-log');
const { getApiKey, store } = require('../storage/store');
const { validateGeminiKey, withTimeout } = require('./key-validation');

const MODEL_LABELS = {
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
};

const MODEL_MAP = {
  'Gemini 2.5 Flash': 'gemini-2.5-flash',
  'Gemini 2.5 Pro': 'gemini-2.5-pro',
  'Gemini 2.0 Flash': 'gemini-2.0-flash',
  'Gemini 1.5 Flash': 'gemini-1.5-flash',
  'Gemini 1.5 Pro': 'gemini-1.5-pro',
};

const PREFERRED_MODEL_ORDER = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

function normalizeModelId(name) {
  return (name || '').replace(/^models\//, '');
}

async function fetchGeminiModelIds(apiKey) {
  const key = encodeURIComponent(apiKey.trim());
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    `https://generativelanguage.googleapis.com/v1/models?key=${key}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await withTimeout(fetch(url), 15000);
      const data = await res.json();
      if (!res.ok) {
        log.warn('[STEALTH-AI] ListModels failed:', data?.error?.message || res.status);
        continue;
      }
      const ids = (data.models || [])
        .filter((m) => {
          const methods = m.supportedGenerationMethods || [];
          return methods.length === 0 || methods.includes('generateContent');
        })
        .map((m) => normalizeModelId(m.name))
        .filter((id) => id.includes('gemini') && !id.includes('embedding') && !id.includes('aqa'));
      if (ids.length) return ids;
    } catch (err) {
      log.warn('[STEALTH-AI] ListModels error:', err.message);
    }
  }
  return [];
}

function sortModels(ids) {
  return [...ids].sort((a, b) => {
    const ai = PREFERRED_MODEL_ORDER.indexOf(a);
    const bi = PREFERRED_MODEL_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function getModelLabel(modelId) {
  return MODEL_LABELS[modelId] || modelId.replace('gemini-', 'Gemini ').replace(/-/g, ' ');
}

function getGeminiModelLabels() {
  const custom = store.get('geminiAvailableModels');
  if (Array.isArray(custom) && custom.length) {
    return custom.map(getModelLabel);
  }
  return Object.keys(MODEL_MAP);
}

function resolveModelId(modelLabel) {
  if (modelLabel === 'Gemini' || modelLabel === 'Google Gemini') {
    const stored = store.get('geminiDefaultModel');
    if (stored) return stored;
    return PREFERRED_MODEL_ORDER[0];
  }
  if (MODEL_MAP[modelLabel]) return MODEL_MAP[modelLabel];
  const stored = store.get('geminiDefaultModel');
  if (stored) return stored;
  return 'gemini-2.0-flash';
}

async function streamGemini({ modelLabel, systemPrompt, userPrompt, onToken, onComplete, onError }) {
  const key = getApiKey('gemini');
  if (!key) {
    onError(new Error('Gemini API key not configured'));
    return;
  }

  let modelId = resolveModelId(modelLabel);
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);

  const tryStream = async (id) => {
    const model = genAI.getGenerativeModel({
      model: id,
      systemInstruction: systemPrompt,
    });
    const result = await withTimeout(model.generateContentStream(userPrompt));
    let full = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        full += text;
        onToken(text);
      }
    }
    return full;
  };

  try {
    const full = await tryStream(modelId);
    onComplete(full);
  } catch (err) {
    log.warn('[STEALTH-AI] Gemini stream retry after:', modelId, err.message);
    try {
      const available = sortModels(await fetchGeminiModelIds(key));
      for (const id of available) {
        if (id === modelId) continue;
        try {
          const full = await tryStream(id);
          onComplete(full);
          return;
        } catch (e) {
          log.warn('[STEALTH-AI] Gemini stream model failed:', id);
        }
      }
    } catch (e) {
      log.error('[STEALTH-AI] Gemini list models failed:', e.message);
    }
    onError(err);
  }
}

async function testGeminiKey(apiKey) {
  const format = validateGeminiKey(apiKey);
  if (!format.valid) {
    return { ok: false, message: format.message };
  }

  const key = apiKey.trim();
  let modelIds = sortModels(await fetchGeminiModelIds(key));

  if (!modelIds.length) {
    modelIds = PREFERRED_MODEL_ORDER;
  }

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);
  let lastErr = null;

  for (const modelId of modelIds) {
    try {
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await withTimeout(model.generateContent('Reply with exactly: OK'), 20000);
      const text =
        typeof result.response?.text === 'function'
          ? result.response.text()
          : result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      store.set('geminiDefaultModel', modelId);
      const labels = modelIds.slice(0, 6).map(getModelLabel);
      store.set('geminiAvailableModels', modelIds.slice(0, 6));

      return {
        ok: true,
        message: `Connected via ${modelId} — ${(text || 'OK').trim().slice(0, 40)}`,
        modelId,
        models: labels,
      };
    } catch (err) {
      lastErr = err;
      const msg = err.message || String(err);
      log.warn('[STEALTH-AI] Gemini test', modelId, msg.slice(0, 120));
      if (msg.includes('401') || msg.includes('API_KEY_INVALID') || msg.includes('UNAUTHENTICATED')) {
        return {
          ok: false,
          message: 'Invalid API key. Copy again from aistudio.google.com → API Keys → Copy key',
        };
      }
      if (msg.includes('404')) {
        continue;
      }
    }
  }

  return {
    ok: false,
    message: (lastErr?.message || 'No Gemini model available for your key').slice(0, 220),
  };
}

module.exports = {
  streamGemini,
  testGeminiKey,
  MODEL_MAP,
  getGeminiModelLabels,
  fetchGeminiModelIds,
};

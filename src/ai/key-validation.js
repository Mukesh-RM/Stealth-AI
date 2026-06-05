function validateGeminiKey(key) {
  const k = (key || '').trim();
  if (!k) return { valid: false, message: 'Key is empty' };
  if (k.startsWith('ya29.')) {
    return {
      valid: false,
      message: 'This looks like an OAuth token. Use an API key from aistudio.google.com/apikey',
    };
  }
  if (!(k.startsWith('AIza') || k.startsWith('AQ.'))) {
    return {
      valid: false,
      message: 'Use a Gemini API key from aistudio.google.com/apikey (AIza… or AQ.… format)',
    };
  }
  if (k.length < 20) {
    return { valid: false, message: 'Key looks too short' };
  }
  return { valid: true };
}

function validateGroqKey(key) {
  const k = (key || '').trim();
  if (!k) return { valid: false, message: 'Key is empty' };
  if (!k.startsWith('gsk_')) {
    return { valid: false, message: 'Groq keys usually start with gsk_' };
  }
  return { valid: true };
}

function validateOpenAIKey(key) {
  const k = (key || '').trim();
  if (!k) return { valid: false, message: 'Key is empty' };
  if (!k.startsWith('sk-')) {
    return { valid: false, message: 'OpenAI keys usually start with sk-' };
  }
  return { valid: true };
}

function validateAnthropicKey(key) {
  const k = (key || '').trim();
  if (!k) return { valid: false, message: 'Key is empty' };
  if (!k.startsWith('sk-ant-')) {
    return { valid: false, message: 'Anthropic keys usually start with sk-ant-' };
  }
  return { valid: true };
}

function validateKeyFormat(provider, key) {
  switch (provider) {
    case 'gemini':
      return validateGeminiKey(key);
    case 'groq':
      return validateGroqKey(key);
    case 'openai':
      return validateOpenAIKey(key);
    case 'anthropic':
      return validateAnthropicKey(key);
    default:
      return { valid: true };
  }
}

function withTimeout(promise, ms = 25000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms / 1000}s — check internet`)), ms)
    ),
  ]);
}

module.exports = {
  validateKeyFormat,
  validateGeminiKey,
  withTimeout,
};

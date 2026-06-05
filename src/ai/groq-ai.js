const log = require('electron-log');
const { getApiKey } = require('../storage/store');

const MODEL_MAP = {
  'Llama 3.1 70B': 'llama-3.1-70b-versatile',
  'Mixtral 8x7B': 'mixtral-8x7b-32768',
};

async function streamGroq({ modelLabel, systemPrompt, userPrompt, onToken, onComplete, onError }) {
  const key = getApiKey('groq');
  if (!key) {
    onError(new Error('Groq API key not configured'));
    return;
  }
  const modelId =
    modelLabel === 'Groq' ? 'llama-3.1-70b-versatile' : MODEL_MAP[modelLabel] || 'llama-3.1-70b-versatile';

  try {
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: key });
    const stream = await groq.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
    });

    let full = '';
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        full += token;
        onToken(token);
      }
    }
    onComplete(full);
  } catch (err) {
    log.error('[STEALTH-AI] Groq stream error:', err.message);
    onError(err);
  }
}

async function testGroqKey(apiKey) {
  try {
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey });
    const res = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Say OK' }],
      max_tokens: 5,
    });
    return { ok: true, message: res.choices[0]?.message?.content || 'OK' };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

module.exports = { streamGroq, testGroqKey, MODEL_MAP };

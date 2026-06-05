const log = require('electron-log');
const { getApiKey } = require('../storage/store');

const MODEL_MAP = {
  'GPT-4o': 'gpt-4o',
  'GPT-4-turbo': 'gpt-4-turbo',
  'GPT-3.5-turbo': 'gpt-3.5-turbo',
};

async function streamOpenAI({ modelLabel, systemPrompt, userPrompt, onToken, onComplete, onError }) {
  const key = getApiKey('openai');
  if (!key) {
    onError(new Error('OpenAI API key not configured'));
    return;
  }
  const modelId =
    modelLabel === 'OpenAI' ? 'gpt-4o' : MODEL_MAP[modelLabel] || 'gpt-4o';

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: key });
    const stream = await openai.chat.completions.create({
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
    log.error('[STEALTH-AI] OpenAI stream error:', err.message);
    onError(err);
  }
}

async function testOpenAIKey(apiKey) {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey });
    const res = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say OK' }],
      max_tokens: 5,
    });
    return { ok: true, message: res.choices[0]?.message?.content || 'OK' };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

module.exports = { streamOpenAI, testOpenAIKey, MODEL_MAP };

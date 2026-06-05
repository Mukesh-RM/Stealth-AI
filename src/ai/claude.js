const log = require('electron-log');
const { getApiKey } = require('../storage/store');

const MODEL_MAP = {
  'Claude 3.5 Sonnet': 'claude-3-5-sonnet-20241022',
  'Claude 3 Haiku': 'claude-3-haiku-20240307',
};

async function streamClaude({ modelLabel, systemPrompt, userPrompt, onToken, onComplete, onError }) {
  const key = getApiKey('anthropic');
  if (!key) {
    onError(new Error('Anthropic API key not configured'));
    return;
  }
  const modelId =
    modelLabel === 'Claude'
      ? 'claude-3-5-sonnet-20241022'
      : MODEL_MAP[modelLabel] || 'claude-3-5-sonnet-20241022';

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: key });
    const stream = client.messages.stream({
      model: modelId,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let full = '';
    stream.on('text', (text) => {
      full += text;
      onToken(text);
    });

    await stream.finalMessage();
    onComplete(full);
  } catch (err) {
    log.error('[STEALTH-AI] Claude stream error:', err.message);
    onError(err);
  }
}

async function testAnthropicKey(apiKey) {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say OK' }],
    });
    const text = msg.content[0]?.text || 'OK';
    return { ok: true, message: text };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

module.exports = { streamClaude, testAnthropicKey, MODEL_MAP };

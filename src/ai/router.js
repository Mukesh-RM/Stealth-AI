const { streamGemini, MODEL_MAP: GEMINI_MODELS, getGeminiModelLabels } = require('./gemini');
const { streamGroq, MODEL_MAP: GROQ_MODELS } = require('./groq-ai');
const { streamOpenAI, MODEL_MAP: OPENAI_MODELS } = require('./openai-chat');
const { streamClaude, MODEL_MAP: CLAUDE_MODELS } = require('./claude');

/** Simple labels shown in session / test UI */
const PROVIDER_CHOICE_LABELS = {
  gemini: 'Gemini',
  groq: 'Groq',
  openai: 'OpenAI',
  anthropic: 'Claude',
};

function getGeminiModels() {
  const dynamic = getGeminiModelLabels();
  return dynamic.length ? dynamic : Object.keys(GEMINI_MODELS);
}

const PROVIDER_MODELS = {
  get gemini() {
    return getGeminiModels();
  },
  groq: Object.keys(GROQ_MODELS),
  openai: Object.keys(OPENAI_MODELS),
  anthropic: Object.keys(CLAUDE_MODELS),
};

function getProviderForModel(modelLabel) {
  const choice = Object.entries(PROVIDER_CHOICE_LABELS).find(([, label]) => label === modelLabel);
  if (choice) return choice[0];
  if (getGeminiModels().includes(modelLabel)) return 'gemini';
  if (PROVIDER_MODELS.groq.includes(modelLabel)) return 'groq';
  if (PROVIDER_MODELS.openai.includes(modelLabel)) return 'openai';
  if (PROVIDER_MODELS.anthropic.includes(modelLabel)) return 'anthropic';
  return null;
}

function streamAnswer(opts) {
  const provider = getProviderForModel(opts.modelLabel);
  switch (provider) {
    case 'gemini':
      return streamGemini(opts);
    case 'groq':
      return streamGroq(opts);
    case 'openai':
      return streamOpenAI(opts);
    case 'anthropic':
      return streamClaude(opts);
    default:
      opts.onError(new Error(`Unknown model: ${opts.modelLabel}`));
      return Promise.resolve();
  }
}

function getAvailableModels(configuredProviders) {
  return configuredProviders
    .map((p) => PROVIDER_CHOICE_LABELS[p])
    .filter(Boolean);
}

module.exports = {
  streamAnswer,
  getProviderForModel,
  getAvailableModels,
  PROVIDER_CHOICE_LABELS,
  PROVIDER_MODELS,
  getGeminiModels,
};

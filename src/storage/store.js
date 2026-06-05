const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { machineIdSync } = require('node-machine-id');
const log = require('electron-log');

const os = require('os');
const APP_DIR =
  process.platform === 'win32'
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'stealth-ai')
    : path.join(os.homedir(), '.stealth-ai');

function ensureAppDir() {
  try {
    fs.mkdirSync(APP_DIR, { recursive: true });
    ['sessions', 'resumes', 'documents'].forEach((sub) => {
      fs.mkdirSync(path.join(APP_DIR, sub), { recursive: true });
    });
  } catch (err) {
    log.error('[STEALTH-AI] ensureAppDir failed:', err.message);
  }
}

function deriveKey() {
  try {
    const id = machineIdSync({ original: true });
    return crypto.scryptSync(id, 'stealth-ai-salt-v1', 32);
  } catch (err) {
    log.warn('[STEALTH-AI] machine-id fallback:', err.message);
    return crypto.scryptSync('stealth-ai-fallback-key', 'stealth-ai-salt-v1', 32);
  }
}

const ENCRYPTION_KEY = deriveKey();

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(payload) {
  if (!payload) return '';
  try {
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, 16);
    const tag = buf.subarray(16, 32);
    const data = buf.subarray(32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (err) {
    log.error('[STEALTH-AI] decrypt failed:', err.message);
    return '';
  }
}

const store = new Store({
  name: 'config',
  cwd: APP_DIR,
  defaults: {
    username: '',
    onboardingComplete: false,
    freeSessionsLeft: 5,
    totalSessions: 0,
    totalAiResponses: 0,
    transcriptionProvider: 'groq',
    apiKeys: {
      gemini: { encrypted: '', verified: false },
      groq: { encrypted: '', verified: false },
      openai: { encrypted: '', verified: false },
      anthropic: { encrypted: '', verified: false },
    },
    overlayOpacity: 0.92,
    answerLength: 'Medium',
  },
});

function getApiKey(provider) {
  const entry = store.get(`apiKeys.${provider}`);
  if (!entry || !entry.encrypted) return '';
  return decrypt(entry.encrypted);
}

function setApiKey(provider, plainKey, verified = false) {
  const keys = store.get('apiKeys') || {};
  keys[provider] = {
    encrypted: plainKey ? encrypt(plainKey) : '',
    verified: !!verified,
  };
  store.set('apiKeys', keys);
}

function getApiKeyEntry(provider) {
  const keys = store.get('apiKeys') || {};
  return keys[provider] || null;
}

function hasApiKey(provider) {
  const entry = getApiKeyEntry(provider);
  return !!(entry && entry.encrypted);
}

function isProviderVerified(provider) {
  const entry = getApiKeyEntry(provider);
  return !!(entry && entry.encrypted && entry.verified);
}

/** Has a saved key — used for model list and session start */
function isProviderConfigured(provider) {
  return hasApiKey(provider);
}

function getConfiguredProviders() {
  return ['gemini', 'groq', 'openai', 'anthropic'].filter(hasApiKey);
}

function getApiKeysStatus() {
  const providers = ['gemini', 'groq', 'openai', 'anthropic'];
  const status = {};
  providers.forEach((p) => {
    const entry = getApiKeyEntry(p);
    status[p] = {
      saved: !!(entry && entry.encrypted),
      verified: !!(entry && entry.encrypted && entry.verified),
      masked: entry?.encrypted ? '••••••••••••••••' : '',
    };
  });
  return status;
}

function getSettings() {
  return {
    username: store.get('username'),
    onboardingComplete: store.get('onboardingComplete'),
    freeSessionsLeft: store.get('freeSessionsLeft'),
    totalSessions: store.get('totalSessions'),
    totalAiResponses: store.get('totalAiResponses'),
    transcriptionProvider: store.get('transcriptionProvider'),
    overlayOpacity: store.get('overlayOpacity'),
    answerLength: store.get('answerLength'),
    apiKeysStatus: getApiKeysStatus(),
    apisConnected: getConfiguredProviders().length,
    apisVerified: ['gemini', 'groq', 'openai', 'anthropic'].filter(isProviderVerified).length,
  };
}

function saveSettings(partial) {
  Object.entries(partial).forEach(([key, value]) => {
    if (key !== 'apiKeysStatus' && value !== undefined) {
      store.set(key, value);
    }
  });
}

function incrementAiResponses() {
  const n = (store.get('totalAiResponses') || 0) + 1;
  store.set('totalAiResponses', n);
  return n;
}

function decrementFreeSession() {
  const left = Math.max(0, (store.get('freeSessionsLeft') || 0) - 1);
  store.set('freeSessionsLeft', left);
  return left;
}

function incrementTotalSessions() {
  const n = (store.get('totalSessions') || 0) + 1;
  store.set('totalSessions', n);
  return n;
}

module.exports = {
  APP_DIR,
  ensureAppDir,
  store,
  encrypt,
  decrypt,
  getApiKey,
  setApiKey,
  hasApiKey,
  isProviderVerified,
  isProviderConfigured,
  getConfiguredProviders,
  getApiKeysStatus,
  getSettings,
  saveSettings,
  incrementAiResponses,
  decrementFreeSession,
  incrementTotalSessions,
};

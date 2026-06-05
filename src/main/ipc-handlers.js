const { ipcMain, dialog, clipboard, BrowserWindow } = require('electron');
const log = require('electron-log');
const fs = require('fs');
const {
  getSettings,
  saveSettings,
  setApiKey,
  getApiKey,
  isProviderConfigured,
  getConfiguredProviders,
  ensureAppDir,
  decrementFreeSession,
  incrementTotalSessions,
  incrementAiResponses,
  store,
} = require('../storage/store');
const sessionManager = require('../storage/session-manager');
const fileParser = require('../storage/file-parser');
const { testGeminiKey } = require('../ai/gemini');
const { validateKeyFormat } = require('../ai/key-validation');
const { testGroqKey } = require('../ai/groq-ai');
const { testOpenAIKey } = require('../ai/openai-chat');
const { testAnthropicKey } = require('../ai/claude');
const { getAvailableModels } = require('../ai/router');
const { buildSystemPrompt, buildUserPrompt } = require('../ai/prompt-builder');
const { streamAnswer } = require('../ai/router');
const { isQuestion } = require('../ai/question-detector');
const { transcribePcm } = require('../transcription/whisper');
const { calculateRms } = require('../audio/audio-utils');
const { isLinux, isMac, isTestMode } = require('./platform');

let appState = null;

function setAppState(state) {
  appState = state;
}

function sendToOverlay(channel, data) {
  if (appState?.overlayWindow && !appState.overlayWindow.isDestroyed()) {
    appState.overlayWindow.webContents.send(channel, data);
  }
}

function sendToDashboard(channel, data) {
  if (appState?.dashboardWindow && !appState.dashboardWindow.isDestroyed()) {
    appState.dashboardWindow.webContents.send(channel, data);
  }
}

function buildBootstrapPayload() {
  const providers = getConfiguredProviders();
  return {
    settings: {
      ...getSettings(),
      availableModels: getAvailableModels(providers),
    },
    sessions: sessionManager.loadAllSessions({ summaryOnly: true }),
    resumes: fileParser.loadAllResumes({ includeText: false }),
    documents: fileParser.loadAllDocuments({ includeText: false }),
    models: getAvailableModels(providers),
    platform: process.platform,
    preferRendererMic: isLinux || isMac,
    isTestMode,
  };
}

function registerIpcHandlers() {
  ensureAppDir();

  ipcMain.handle('app:bootstrap', async () => {
    try {
      return buildBootstrapPayload();
    } catch (err) {
      log.error('[STEALTH-AI] app:bootstrap', err.message);
      return buildBootstrapPayload();
    }
  });

  ipcMain.handle('settings:load', async () => {
    try {
      return {
        ...getSettings(),
        availableModels: getAvailableModels(getConfiguredProviders()),
      };
    } catch (err) {
      log.error('[STEALTH-AI] settings:load', err.message);
      return getSettings();
    }
  });

  ipcMain.handle('settings:save', async (_e, partial) => {
    try {
      saveSettings(partial);
      return getSettings();
    } catch (err) {
      log.error('[STEALTH-AI] settings:save', err.message);
      throw err;
    }
  });

  ipcMain.handle('settings:test-api-key', async (_e, { provider, apiKey }) => {
    try {
      const key = (apiKey && apiKey.trim()) || getApiKey(provider);
      if (!key) {
        return { ok: false, message: 'No API key saved. Paste a key first.' };
      }
      const format = validateKeyFormat(provider, key);
      if (!format.valid) {
        return { ok: false, message: format.message };
      }
      log.info('[STEALTH-AI] Testing API key for', provider);
      let result;
      switch (provider) {
        case 'gemini':
          result = await testGeminiKey(key);
          break;
        case 'groq':
          result = await testGroqKey(key);
          break;
        case 'openai':
          result = await testOpenAIKey(key);
          break;
        case 'anthropic':
          result = await testAnthropicKey(key);
          break;
        default:
          return { ok: false, message: 'Unknown provider' };
      }
      if (result.ok) {
        setApiKey(provider, key, true);
      }
      return result;
    } catch (err) {
      log.error('[STEALTH-AI] settings:test-api-key', err.message);
      return { ok: false, message: err.message };
    }
  });

  ipcMain.handle('settings:save-api-key', async (_e, { provider, apiKey }) => {
    try {
      const existing = getApiKey(provider);
      const keyToSave = (apiKey && apiKey.trim()) || existing;
      if (!keyToSave) {
        setApiKey(provider, '', false);
        return { ok: true, verified: false, message: 'Key cleared' };
      }
      const format = validateKeyFormat(provider, keyToSave);
      if (!format.valid) {
        return { ok: false, verified: false, message: format.message };
      }
      setApiKey(provider, keyToSave, false);
      log.info('[STEALTH-AI] Save+test API key for', provider);
      let result;
      switch (provider) {
        case 'gemini':
          result = await testGeminiKey(keyToSave);
          break;
        case 'groq':
          result = await testGroqKey(keyToSave);
          break;
        case 'openai':
          result = await testOpenAIKey(keyToSave);
          break;
        case 'anthropic':
          result = await testAnthropicKey(keyToSave);
          break;
        default:
          return { ok: false, message: 'Unknown provider' };
      }
      setApiKey(provider, keyToSave, result.ok);
      return {
        ok: true,
        verified: result.ok,
        message: result.ok ? `Connected — ${result.message}` : `Key saved. Test failed: ${result.message}`,
      };
    } catch (err) {
      return { ok: false, verified: false, message: err.message };
    }
  });

  ipcMain.handle('ai:quick-test', async (_e, { provider, modelLabel, prompt }) => {
    const providers = getConfiguredProviders();
    const prov = provider || providers[0];
    if (!prov) {
      return { ok: false, message: 'Add and save an API key first' };
    }
    const models = getAvailableModels(getConfiguredProviders());
    const model = modelLabel || models[0];
    if (!model) {
      return { ok: false, message: 'No model available for configured keys' };
    }

    const userPrompt = prompt || 'Say hello in one short sentence.';
    let full = '';
    const start = Date.now();

    try {
      await new Promise((resolve, reject) => {
        streamAnswer({
          modelLabel: model,
          systemPrompt: 'You are a helpful assistant. Be brief.',
          userPrompt,
          onToken: (t) => {
            full += t;
          },
          onComplete: (text) => {
            full = text || full;
            resolve();
          },
          onError: reject,
        });
      });
      incrementAiResponses();
      return {
        ok: true,
        provider: prov,
        model,
        text: full,
        elapsed: ((Date.now() - start) / 1000).toFixed(1),
      };
    } catch (err) {
      log.error('[STEALTH-AI] ai:quick-test', err.message);
      return { ok: false, message: err.message };
    }
  });

  ipcMain.handle('session:load-all', async () =>
    sessionManager.loadAllSessions({ summaryOnly: true })
  );

  ipcMain.handle('session:load', async (_e, id) => sessionManager.loadSession(id));

  ipcMain.handle('session:delete', async (_e, id) => {
    sessionManager.deleteSession(id);
    return true;
  });

  ipcMain.handle('session:save', async (_e, session) => sessionManager.saveSession(session));

  ipcMain.handle('session:create', async (_e, config) => {
    try {
      const freeLeft = store.get('freeSessionsLeft') || 0;
      const hasKeys = getConfiguredProviders().length > 0;
      if (freeLeft <= 0 && !hasKeys) {
        return { error: 'Add API Keys to continue. No free sessions remaining.' };
      }
      const usedFree = freeLeft > 0;
      if (usedFree) {
        decrementFreeSession();
      }
      incrementTotalSessions();
      const session = sessionManager.createSession({
        ...config,
        isFree: usedFree,
        status: usedFree ? 'Free' : 'Active',
      });
      appState.activeSession = session;
      return { session, freeSessionsLeft: store.get('freeSessionsLeft') };
    } catch (err) {
      log.error('[STEALTH-AI] session:create', err.message);
      return { error: err.message };
    }
  });

  ipcMain.handle('resume:load-all', async () =>
    fileParser.loadAllResumes({ includeText: false })
  );

  ipcMain.handle('resume:delete', async (_e, id) => {
    fileParser.deleteResume(id);
    return true;
  });

  ipcMain.handle('resume:upload-pdf', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow() || appState?.dashboardWindow;
      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (canceled || !filePaths[0]) return { canceled: true };
      const buffer = fs.readFileSync(filePaths[0]);
      const text = await fileParser.parsePdf(buffer);
      const saved = fileParser.saveResume({
        title: require('path').basename(filePaths[0]),
        text,
        filename: filePaths[0],
        source: 'pdf',
      });
      return { ok: true, resume: saved };
    } catch (err) {
      log.error('[STEALTH-AI] resume:upload-pdf', err.message);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('resume:save-manual', async (_e, { title, text }) => {
    try {
      const saved = fileParser.saveResume({ title, text, source: 'manual' });
      return { ok: true, resume: saved };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('document:load-all', async () =>
    fileParser.loadAllDocuments({ includeText: false })
  );

  ipcMain.handle('document:save', async (_e, payload) => {
    try {
      const doc = fileParser.saveDocument(payload);
      return { ok: true, document: doc };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('document:delete', async (_e, id) => {
    fileParser.deleteDocument(id);
    return true;
  });

  ipcMain.handle('models:available', async () =>
    getAvailableModels(getConfiguredProviders())
  );

  ipcMain.on('audio:start', () => {
    try {
      appState?.audioCapture?.start();
      appState.recording = true;
      appState?.updateTrayState?.('recording');
    } catch (err) {
      log.error('[STEALTH-AI] audio:start', err.message);
    }
  });

  ipcMain.on('audio:stop', () => {
    try {
      appState?.audioCapture?.stop();
      appState.recording = false;
      appState?.updateTrayState?.('idle');
    } catch (err) {
      log.error('[STEALTH-AI] audio:stop', err.message);
    }
  });

  ipcMain.on('audio:pcm-chunk', (_e, payload) => {
    try {
      const buf = Buffer.isBuffer(payload)
        ? payload
        : Buffer.from(payload?.data || payload);
      if (buf.length < 8000) return;
      if (calculateRms(buf) < 0.002) return;
      appState?.audioCapture?.ingestPcm(buf, 'browser-mic');
    } catch (err) {
      log.warn('[STEALTH-AI] audio:pcm-chunk', err.message);
    }
  });

  ipcMain.on('audio:level-relay', (_e, { level }) => {
    if (typeof level === 'number') {
      sendToOverlay('audio:level-update', { level });
    }
  });

  ipcMain.on('audio:status-relay', (_e, status) => {
    if (!status) return;
    if (status.state === 'mic-ok') {
      sendToOverlay('audio:status', {
        ok: true,
        source: status.source || 'browser',
        message: 'Microphone active — speak clearly for a few seconds.',
      });
      return;
    }
    if (status.state === 'mic-error') {
      sendToOverlay('audio:status', {
        ok: false,
        message: status.message || 'Microphone permission denied',
      });
    }
  });

  ipcMain.on('window:show-overlay', () => appState?.showOverlay?.());
  ipcMain.on('window:hide-overlay', () => appState?.hideOverlay?.());
  ipcMain.on('window:show-dashboard', () => appState?.showDashboard?.());

  ipcMain.handle('window:set-opacity', async (_e, opacity) => {
    try {
      const o = Math.min(1, Math.max(0.3, opacity));
      store.set('overlayOpacity', o);
      if (appState?.overlayWindow && !appState.overlayWindow.isDestroyed()) {
        appState.overlayWindow.setOpacity(o);
      }
      return o;
    } catch (err) {
      return store.get('overlayOpacity');
    }
  });

  ipcMain.on('window:move', (_e, { dx, dy }) => {
    if (!appState?.overlayWindow) return;
    const [x, y] = appState.overlayWindow.getPosition();
    appState.overlayWindow.setPosition(x + dx, y + dy);
  });

  ipcMain.on('overlay:minimize', () => appState?.overlayWindow?.minimize());
  ipcMain.on('overlay:close', () => appState?.hideOverlay?.());

  ipcMain.on('ai:trigger', async (_e, { question, transcript }) => {
    await runAiGeneration(question, transcript, false);
  });

  ipcMain.on('ai:regenerate', async (_e, payload) => {
    await runAiGeneration(payload?.question, payload?.transcript, true);
  });

  async function runAiGeneration(question, transcript, isRegen) {
    const session = appState?.activeSession;
    if (!session) {
      sendToOverlay('ai:stream-error', { message: 'No active session' });
      return;
    }
    const q =
      question ||
      (transcript || '')
        .split('\n')
        .filter(Boolean)
        .pop() ||
      '';
    if (!q.trim()) {
      sendToOverlay('ai:stream-error', { message: 'No question to answer' });
      return;
    }

    let resumeText = '';
    if (session.config?.resumeId) {
      resumeText = fileParser.getResumeText(session.config.resumeId);
    }
    let docText = '';
    (session.config?.documentIds || []).forEach((id) => {
      docText += fileParser.getDocumentText(id) + '\n';
    });

    const systemPrompt = buildSystemPrompt({
      resumeText,
      jobDescription: session.config?.jobDescription,
      company: session.config?.company,
      extraContext: [session.config?.extraContext, docText].filter(Boolean).join('\n'),
    });
    const userPrompt = buildUserPrompt(q, transcript);

    const start = Date.now();
    sendToOverlay('ai:stream-start', { question: q });

    await streamAnswer({
      modelLabel:
        session.config?.aiModel ||
        getAvailableModels(getConfiguredProviders())[0] ||
        'Gemini',
      systemPrompt,
      userPrompt,
      onToken: (token) => sendToOverlay('ai:stream-token', { token }),
      onComplete: (full) => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        incrementAiResponses();
        if (session.config?.saveTranscript !== false) {
          sessionManager.appendQAPair(session.id, q, full);
        }
        sendToOverlay('ai:stream-complete', { full, elapsed });
      },
      onError: (err) => {
        sendToOverlay('ai:stream-error', { message: err.message });
      },
    });
  }

  if (appState?.audioCapture) {
    let transcribeBusy = false;
    let lastTranscribeAt = 0;

    const runTranscription = async (audio, source) => {
      if (!audio || audio.length < 8000) return;
      if (!getApiKey('groq') && !getApiKey('openai')) {
        sendToOverlay('transcription:error', {
          message: 'Add a Groq API key (API Keys page) for speech-to-text.',
        });
        return;
      }
      const now = Date.now();
      if (transcribeBusy || now - lastTranscribeAt < 2500) return;
      transcribeBusy = true;
      lastTranscribeAt = now;
      sendToOverlay('transcription:status', { state: 'processing' });
      try {
        const text = await transcribePcm(audio);
        if (!text) {
          sendToOverlay('transcription:status', { state: 'listening' });
          return;
        }
        sendToOverlay('transcription:chunk', { text });
        sendToOverlay('transcription:status', { state: 'listening' });
        if (appState.activeSession) {
          sessionManager.appendTranscript(appState.activeSession.id, {
            role: 'interviewer',
            text,
          });
        }
        if (isQuestion(text)) {
          sendToOverlay('transcription:question-detected', { text });
          if (appState.activeSession?.config?.autoGenerate) {
            await runAiGeneration(text, text, false);
          }
        }
      } catch (err) {
        log.warn('[STEALTH-AI] transcription failed:', err.message);
        sendToOverlay('transcription:error', { message: err.message });
        sendToOverlay('transcription:status', { state: 'error' });
      } finally {
        transcribeBusy = false;
      }
    };

    appState.audioCapture.on('chunk', ({ audio }) => runTranscription(audio));
    appState.audioCapture.on('speech-segment', ({ audio }) => runTranscription(audio));

    appState.audioCapture.on('mic-status', (status) => {
      if (status?.message?.includes('arecord')) return;
      sendToOverlay('audio:status', status);
    });

    let lastLevelSent = 0;
    appState.audioCapture.on('level-update', (level) => {
      const now = Date.now();
      if (now - lastLevelSent < 100) return;
      lastLevelSent = now;
      sendToOverlay('audio:level-update', { level });
    });
  }
}

module.exports = { registerIpcHandlers, setAppState, sendToOverlay };

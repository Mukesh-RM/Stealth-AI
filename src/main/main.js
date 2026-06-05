const { app, BrowserWindow, ipcMain, clipboard, session } = require('electron');

if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
  app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
}

app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

const path = require('path');
const log = require('electron-log');
const { AudioCapture } = require('../audio/audio-capture');
const { ensureAppDir, store } = require('../storage/store');
const { registerIpcHandlers, setAppState } = require('./ipc-handlers');
const { createTray, updateTrayState, destroyTray } = require('./tray');
const { registerHotkeys, unregisterHotkeys } = require('./hotkeys');
const {
  supportsOverlayUI,
  supportsCaptureExclusion,
  isWindows,
  isTestMode,
} = require('./platform');

log.transports.file.level = 'info';
log.info('[STEALTH-AI] Starting application on', process.platform, isTestMode ? '(test mode)' : '');

let dashboardWindow = null;
let overlayWindow = null;
let overlayVisible = false;
let recording = false;
let lastAnswer = '';
let lastQuestion = '';

const audioCapture = new AudioCapture();

const appState = {
  dashboardWindow: null,
  overlayWindow: null,
  audioCapture,
  activeSession: null,
  recording: false,
  overlayVisible: false,
  updateTrayState: (s) => updateTrayState(s, appState),
  rebuildTrayMenu: null,
};

function loadStealthNative(overlayWin) {
  if (!supportsCaptureExclusion) return;
  try {
    const stealthPath = path.join(
      app.getAppPath(),
      'native',
      'windows-stealth',
      'build',
      'Release',
      'windows-stealth.node'
    );
    const stealth = require(stealthPath);
    stealth.excludeFromCapture(overlayWin.getNativeWindowHandle());
    log.info('[STEALTH-AI] WDA_EXCLUDEFROMCAPTURE applied');
  } catch (e) {
    log.warn('[STEALTH-AI] Native addon unavailable:', e.message);
  }
}

function createDashboardWindow() {
  dashboardWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: true,
    center: true,
    backgroundColor: '#0f0f13',
    title: 'Stealth AI',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: DASHBOARD_PRELOAD_WEBPACK_ENTRY || path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      spellcheck: false,
    },
  });

  appState.dashboardWindow = dashboardWindow;

  const entry =
    typeof DASHBOARD_WEBPACK_ENTRY !== 'undefined'
      ? DASHBOARD_WEBPACK_ENTRY
      : `file://${path.join(__dirname, '../renderer/dashboard/index.html')}`;

  dashboardWindow.loadURL(entry);

  dashboardWindow.once('ready-to-show', () => {
    dashboardWindow.show();
    dashboardWindow.focus();
  });

  dashboardWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log.error('[STEALTH-AI] Dashboard failed to load:', code, desc, url);
  });

  dashboardWindow.on('closed', () => {
    dashboardWindow = null;
    appState.dashboardWindow = null;
  });

  return dashboardWindow;
}

function createOverlayWindow() {
  const transparent = supportsCaptureExclusion;

  overlayWindow = new BrowserWindow({
    width: 420,
    height: 580,
    transparent,
    frame: !transparent,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: true,
    focusable: true,
    show: false,
    backgroundColor: transparent ? '#00000000' : '#0c0c16',
    title: isTestMode ? 'Stealth AI — Test Overlay' : 'Stealth AI Overlay',
    webPreferences: {
      preload: OVERLAY_PRELOAD_WEBPACK_ENTRY || path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  appState.overlayWindow = overlayWindow;

  if (supportsCaptureExclusion) {
    try {
      overlayWindow.setContentProtection(true);
    } catch (e) {
      log.warn('[STEALTH-AI] setContentProtection:', e.message);
    }
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  } else {
    overlayWindow.setAlwaysOnTop(true, 'floating');
  }

  overlayWindow.setOpacity(store.get('overlayOpacity') || 0.92);

  const entry =
    typeof OVERLAY_WEBPACK_ENTRY !== 'undefined'
      ? OVERLAY_WEBPACK_ENTRY
      : `file://${path.join(__dirname, '../renderer/overlay/index.html')}`;

  overlayWindow.loadURL(entry);

  overlayWindow.webContents.once('did-finish-load', () => {
    loadStealthNative(overlayWindow);
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    appState.overlayWindow = null;
  });

  return overlayWindow;
}

appState.showOverlay = () => {
  if (!overlayWindow || overlayWindow.isDestroyed()) createOverlayWindow();
  overlayVisible = true;
  appState.overlayVisible = true;
  overlayWindow.show();
  overlayWindow.focus();
  appState.rebuildTrayMenu?.();
};

appState.hideOverlay = () => {
  overlayVisible = false;
  appState.overlayVisible = false;
  overlayWindow?.hide();
  appState.rebuildTrayMenu?.();
};

appState.toggleOverlay = () => {
  if (overlayVisible) appState.hideOverlay();
  else appState.showOverlay();
};

appState.showDashboard = () => {
  if (!dashboardWindow || dashboardWindow.isDestroyed()) createDashboardWindow();
  if (dashboardWindow.isMinimized()) dashboardWindow.restore();
  dashboardWindow.show();
  dashboardWindow.focus();
};

appState.toggleRecording = () => {
  if (recording) {
    audioCapture.stop();
    recording = false;
    appState.recording = false;
    updateTrayState('paused', appState);
  } else {
    audioCapture.start().catch((e) => log.warn('[STEALTH-AI] audio start:', e.message));
    recording = true;
    appState.recording = true;
    updateTrayState('recording', appState);
  }
  appState.rebuildTrayMenu?.();
};

appState.toggleMic = () => {
  audioCapture.setMicEnabled(!audioCapture.micEnabled);
};

appState.triggerAnswer = () => {
  overlayWindow?.webContents.send('hotkey:answer');
};

appState.copyAnswer = () => {
  if (lastAnswer) clipboard.writeText(lastAnswer);
  overlayWindow?.webContents.send('hotkey:copy');
};

appState.regenerateAnswer = () => {
  overlayWindow?.webContents.send('hotkey:regen');
};

appState.adjustOpacity = (delta) => {
  const current = overlayWindow?.getOpacity?.() ?? store.get('overlayOpacity') ?? 0.92;
  const next = Math.min(1, Math.max(0.3, current + delta));
  store.set('overlayOpacity', next);
  overlayWindow?.setOpacity(next);
};

appState.quitApp = () => {
  app.quit();
};

ipcMain.on('overlay:set-last-answer', (_e, { answer, question }) => {
  lastAnswer = answer || '';
  lastQuestion = question || '';
});

ipcMain.handle('platform:info', async () => ({
  platform: process.platform,
  isTestMode,
  supportsOverlayUI,
  supportsCaptureExclusion,
  supportsStealthOverlay: supportsOverlayUI,
  supportsDashboard: true,
}));

function launchSession(session) {
  appState.activeSession = session;
  if (!overlayWindow || overlayWindow.isDestroyed()) createOverlayWindow();
  appState.showOverlay();
  const notifySessionActive = () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('session:active', { sessionId: session?.id });
    }
  };
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (overlayWindow.webContents.isLoading()) {
      overlayWindow.webContents.once('did-finish-load', notifySessionActive);
    } else {
      notifySessionActive();
      setTimeout(notifySessionActive, 600);
    }
  }
  if (isWindows) {
    dashboardWindow?.minimize();
  }
  audioCapture
    .start()
    .then(() => {
      recording = true;
      appState.recording = true;
      updateTrayState('recording', appState);
    })
    .catch((e) => log.warn('[STEALTH-AI] Session audio:', e.message));
}

ipcMain.on('session:launch', (_e, session) => {
  launchSession(session);
});

app.whenReady().then(() => {
  ensureAppDir();

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media' || permission === 'microphone' || permission === 'audioCapture') {
      callback(true);
      return;
    }
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'media' || permission === 'microphone' || permission === 'audioCapture';
  });

  if (isWindows) {
    app.setAppUserModelId('com.stealthai.desktop');
    app.setLoginItemSettings({ openAtLogin: false });
  }

  setAppState(appState);
  registerIpcHandlers();

  createDashboardWindow();
  createOverlayWindow();
  appState.hideOverlay();

  try {
    createTray(appState);
  } catch (e) {
    log.warn('[STEALTH-AI] System tray unavailable:', e.message);
  }

  registerHotkeys(appState);
  appState.showDashboard();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  unregisterHotkeys();
  audioCapture.stop();
  destroyTray();
});

app.on('will-quit', () => {
  unregisterHotkeys();
});

module.exports = { appState, launchSession };

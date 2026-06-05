const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const log = require('electron-log');

let tray = null;
let trayState = 'idle';

function getTrayIconPath() {
  return path.join(__dirname, '../../assets/tray-icon.png');
}

function buildTrayImage(state) {
  try {
    const iconPath = getTrayIconPath();
    let image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) {
      image = nativeImage.createEmpty();
    }
    if (process.platform === 'win32' && !image.isEmpty()) {
      image = image.resize({ width: 16, height: 16 });
    }
    return image;
  } catch (err) {
    log.warn('[STEALTH-AI] Tray icon load failed:', err.message);
    return nativeImage.createEmpty();
  }
}

function createTray(appState) {
  if (tray) return tray;

  const image = buildTrayImage('idle');
  if (image.isEmpty() && process.platform === 'linux') {
    log.warn('[STEALTH-AI] Tray icon missing — use the Dashboard window');
    return null;
  }

  tray = new Tray(image);
  tray.setToolTip('Stealth AI');

  const rebuildMenu = () => {
    const recording = appState.recording;
    const menu = Menu.buildFromTemplate([
      {
        label: appState.overlayVisible ? 'Hide Overlay' : 'Show Overlay',
        click: () => appState.toggleOverlay?.(),
      },
      {
        label: 'Show Dashboard',
        click: () => appState.showDashboard?.(),
      },
      {
        label: recording ? 'Pause Recording' : 'Resume Recording',
        click: () => appState.toggleRecording?.(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => appState.quitApp?.(),
      },
    ]);
    tray.setContextMenu(menu);
  };

  rebuildMenu();
  appState.rebuildTrayMenu = rebuildMenu;

  tray.on('click', () => {
    if (process.platform === 'linux') {
      appState.showDashboard?.();
    } else {
      appState.toggleOverlay?.();
    }
  });

  tray.on('double-click', () => {
    appState.showDashboard?.();
  });

  return tray;
}

function updateTrayState(state, appState) {
  trayState = state;
  const labels = {
    recording: 'Stealth AI — Recording',
    paused: 'Stealth AI — Paused',
    idle: 'Stealth AI — Idle',
  };
  if (tray) {
    tray.setToolTip(labels[state] || labels.idle);
    appState?.rebuildTrayMenu?.();
  }
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, updateTrayState, destroyTray };

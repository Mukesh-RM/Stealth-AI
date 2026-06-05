const { globalShortcut } = require('electron');
const log = require('electron-log');

function registerHotkeys(appState) {
  const shortcuts = [
    {
      accel: 'CommandOrControl+Shift+H',
      action: () => appState.toggleOverlay?.(),
    },
    {
      accel: 'CommandOrControl+Shift+A',
      action: () => appState.triggerAnswer?.(),
    },
    {
      accel: 'CommandOrControl+Shift+C',
      action: () => appState.copyAnswer?.(),
    },
    {
      accel: 'CommandOrControl+Shift+R',
      action: () => appState.regenerateAnswer?.(),
    },
    {
      accel: 'CommandOrControl+Shift+M',
      action: () => appState.toggleMic?.(),
    },
    {
      accel: 'CommandOrControl+Shift+[',
      action: () => appState.adjustOpacity?.(-0.05),
    },
    {
      accel: 'CommandOrControl+Shift+]',
      action: () => appState.adjustOpacity?.(0.05),
    },
    {
      accel: 'CommandOrControl+Shift+S',
      action: () => appState.showDashboard?.(),
    },
    {
      accel: 'CommandOrControl+Shift+X',
      action: () => appState.quitApp?.(),
    },
  ];

  shortcuts.forEach(({ accel, action }) => {
    try {
      const ok = globalShortcut.register(accel, () => {
        try {
          action();
        } catch (err) {
          log.error('[STEALTH-AI] Hotkey action failed:', err.message);
        }
      });
      if (!ok) {
        log.warn('[STEALTH-AI] Failed to register hotkey:', accel);
      }
    } catch (err) {
      log.warn('[STEALTH-AI] Hotkey register error:', accel, err.message);
    }
  });

  log.info('[STEALTH-AI] Global hotkeys registered');
}

function unregisterHotkeys() {
  globalShortcut.unregisterAll();
}

module.exports = { registerHotkeys, unregisterHotkeys };

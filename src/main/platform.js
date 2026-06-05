const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

/** Overlay UI + AI + sessions — all platforms (Linux = test mode) */
const supportsOverlayUI = true;

/** Invisible to Zoom/OBS/screen capture — Windows only */
const supportsCaptureExclusion = isWindows;

/** WASAPI loopback — Windows only */
const supportsSystemAudioLoopback = isWindows;

const isTestMode = !isWindows;

module.exports = {
  isWindows,
  isLinux,
  isMac,
  supportsOverlayUI,
  supportsCaptureExclusion,
  supportsSystemAudioLoopback,
  isTestMode,
  // backwards compat
  supportsStealthOverlay: supportsOverlayUI,
  supportsDashboard: true,
};

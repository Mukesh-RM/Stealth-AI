const { spawn } = require('child_process');
const log = require('electron-log');
const { SAMPLE_RATE } = require('./audio-utils');

/**
 * Linux/PipeWire mic via ALSA arecord (no native npm module required).
 */
function startArecordMic({ onData, onError, device }) {
  const dev = device || process.env.STEALTH_MIC_DEVICE || 'default';
  const args = ['-f', 'S16_LE', '-r', String(SAMPLE_RATE), '-c', '1', '-t', 'raw', '-D', dev];

  let proc;
  try {
    proc = spawn('arecord', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    onError(err);
    return null;
  }

  proc.stdout.on('data', onData);
  proc.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg && !msg.includes('Recording')) {
      log.warn('[STEALTH-AI] arecord:', msg);
    }
  });
  proc.on('error', (err) => {
    log.error('[STEALTH-AI] arecord spawn error:', err.message);
    onError(err);
  });
  proc.on('close', (code, signal) => {
    if (code !== 0 && code !== null) {
      const err = new Error(`arecord stopped (code ${code}${signal ? `, ${signal}` : ''})`);
      log.warn('[STEALTH-AI]', err.message);
      onError(err);
    }
  });

  log.info('[STEALTH-AI] arecord mic started, device:', dev);
  return proc;
}

module.exports = { startArecordMic };

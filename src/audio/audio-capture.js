const { EventEmitter } = require('events');
const log = require('electron-log');
const { VoiceActivityDetector } = require('./vad');
const { calculateRms, SAMPLE_RATE, mergeBuffers } = require('./audio-utils');
const { startArecordMic } = require('./arecord-mic');

const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

const CHUNK_MS = 3000;
const CHUNK_BYTES = SAMPLE_RATE * 2 * (CHUNK_MS / 1000);

class AudioCapture extends EventEmitter {
  constructor() {
    super();
    this.micRecorder = null;
    this.loopbackStream = null;
    this.vad = new VoiceActivityDetector();
    this.running = false;
    this.micEnabled = true;
    this.rollingBuffer = [];
    this.rollingSize = 0;
    this.levelInterval = null;
    this.arecordProc = null;
    this.micSource = null;
  }

  ingestPcm(chunk, source = 'external') {
    if (!this.running || !chunk || chunk.length < 2) return;
    this.handlePcm(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk), source);
  }

  async start() {
    if (this.running) return;
    this.running = true;
    this.rollingBuffer = [];
    this.rollingSize = 0;

    try {
      await this.startMicrophone();
      if (this.micSource === 'browser') {
        this.emit('mic-status', {
          ok: true,
          source: 'browser',
          message: 'Allow microphone in the overlay when prompted, then speak clearly.',
        });
      } else {
        this.emit('mic-status', { ok: true, source: this.micSource });
      }
    } catch (err) {
      log.warn('[STEALTH-AI] Microphone unavailable:', err.message);
      this.emit('mic-status', { ok: false, message: err.message });
    }

    try {
      await this.startLoopback();
    } catch (err) {
      log.warn('[STEALTH-AI] Loopback unavailable (Windows required):', err.message);
    }

    this.levelInterval = setInterval(() => {
      if (this.lastLevel !== undefined) {
        this.emit('level', this.lastLevel);
      }
    }, 100);

    log.info('[STEALTH-AI] Audio capture started');
  }

  async startMicrophone() {
    if (process.platform !== 'win32' && process.platform !== 'linux' && process.platform !== 'darwin') {
      throw new Error('Unsupported platform for microphone');
    }

    // PipeWire/ALSA arecord often fails in Electron on Linux; overlay uses getUserMedia instead.
    if (isLinux) {
      this.micSource = 'browser';
      log.info('[STEALTH-AI] Linux mic: waiting for overlay browser capture (allow mic when prompted)');
      return;
    }

    try {
      await this.startNodeRecordMic();
      this.micSource = 'node-record';
      return;
    } catch (e) {
      log.warn('[STEALTH-AI] node-record mic failed:', e.message);
    }

    if (isMac) {
      try {
        await this.startArecordMic();
        this.micSource = 'arecord';
        return;
      } catch (e) {
        log.warn('[STEALTH-AI] arecord failed:', e.message);
        this.micSource = 'browser';
        return;
      }
    }

    throw new Error(
      'Microphone unavailable. Install sox (Windows/Mac) or allow mic access in the overlay.'
    );
  }

  async startNodeRecordMic() {
    let record;
    try {
      record = require('node-record-lpcm16');
    } catch (e) {
      throw new Error('node-record-lpcm16 not installed');
    }

    const device = process.env.STEALTH_MIC_DEVICE || 'default';
    this.micRecorder = record.record({
      sampleRate: SAMPLE_RATE,
      channels: 1,
      device,
      verbose: false,
      recordProgram: process.platform === 'darwin' ? 'rec' : process.platform === 'win32' ? 'sox' : 'arecord',
    });

    if (!this.micRecorder || !this.micRecorder.stream) {
      throw new Error('Failed to start microphone recorder');
    }

    this.micRecorder.stream().on('data', (chunk) => {
      if (!this.running || !this.micEnabled) return;
      this.handlePcm(chunk, 'mic');
    });

    this.micRecorder.stream().on('error', (err) => {
      log.error('[STEALTH-AI] Mic stream error:', err.message);
      this.emit('mic-status', { ok: false, message: err.message });
    });
  }

  startArecordMic() {
    return new Promise((resolve, reject) => {
      let settled = false;
      const proc = startArecordMic({
        device: process.env.STEALTH_MIC_DEVICE,
        onData: (chunk) => {
          if (!settled) {
            settled = true;
            resolve();
          }
          if (!this.running || !this.micEnabled) return;
          this.handlePcm(chunk, 'mic');
        },
        onError: (err) => {
          if (!settled) {
            settled = true;
            reject(err);
            return;
          }
          if (this.running) {
            this.emit('mic-status', { ok: false, message: err.message });
          }
        },
      });
      if (!proc) {
        reject(new Error('arecord not found — install alsa-utils (sudo dnf install alsa-utils)'));
        return;
      }
      this.arecordProc = proc;
      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve();
        }
      }, 400);
    });
  }

  async startLoopback() {
    if (process.platform !== 'win32') {
      return;
    }
    let portAudio;
    try {
      portAudio = require('naudiodon');
    } catch (e) {
      throw new Error('naudiodon not available');
    }

    const devices = portAudio.getDevices();
    const loopback = devices.find(
      (d) =>
        d.maxInputChannels > 0 &&
        (d.name.toLowerCase().includes('loopback') ||
          d.name.toLowerCase().includes('stereo mix') ||
          d.hostAPIName === 'Windows WASAPI')
    );

    const deviceId = loopback ? loopback.id : -1;
    const ai = new portAudio.AudioIO({
      inOptions: {
        channelCount: 2,
        sampleFormat: portAudio.SampleFormat16Bit,
        sampleRate: SAMPLE_RATE,
        deviceId,
        closeOnError: true,
      },
    });

    ai.on('data', (chunk) => {
      if (!this.running) return;
      const mono = this.stereoToMono(chunk);
      this.handlePcm(mono, 'loopback');
    });

    ai.on('error', (err) => {
      log.error('[STEALTH-AI] Loopback error:', err.message);
    });

    ai.start();
    this.loopbackStream = ai;
  }

  stereoToMono(buffer) {
    if (buffer.length < 4) return buffer;
    const out = Buffer.alloc(buffer.length / 2);
    for (let i = 0, j = 0; j < out.length; i += 4, j += 2) {
      const left = buffer.readInt16LE(i);
      const right = buffer.readInt16LE(i + 2);
      out.writeInt16LE(Math.round((left + right) / 2), j);
    }
    return out;
  }

  handlePcm(chunk, source) {
    this.lastLevel = calculateRms(chunk);
    this.emit('level-update', this.lastLevel);

    this.rollingBuffer.push(chunk);
    this.rollingSize += chunk.length;
    while (this.rollingSize > CHUNK_BYTES && this.rollingBuffer.length > 0) {
      const first = this.rollingBuffer[0];
      if (this.rollingSize - first.length >= CHUNK_BYTES) {
        this.rollingSize -= first.length;
        this.rollingBuffer.shift();
      } else {
        break;
      }
    }

    const vadResult = this.vad.processChunk(chunk);
    if (vadResult.type === 'segment' && vadResult.audio) {
      this.emit('speech-segment', { audio: vadResult.audio, source });
    }

    const total = this.rollingBuffer.reduce((s, b) => s + b.length, 0);
    if (total >= CHUNK_BYTES) {
      const combined = mergeBuffers(this.rollingBuffer);
      const slice = combined.subarray(combined.length - CHUNK_BYTES);
      if (this.lastLevel >= 0.003) {
        this.emit('chunk', { audio: slice, source, timestamp: Date.now() });
      }
    }
  }

  setMicEnabled(enabled) {
    this.micEnabled = enabled;
    log.info('[STEALTH-AI] Mic', enabled ? 'enabled' : 'disabled');
  }

  stop() {
    this.running = false;
    if (this.levelInterval) {
      clearInterval(this.levelInterval);
      this.levelInterval = null;
    }
    try {
      if (this.micRecorder) {
        this.micRecorder.stop();
        this.micRecorder = null;
      }
    } catch (e) {
      log.warn('[STEALTH-AI] mic stop:', e.message);
    }
    try {
      if (this.arecordProc) {
        this.arecordProc.kill('SIGTERM');
        this.arecordProc = null;
      }
    } catch (e) {
      log.warn('[STEALTH-AI] arecord stop:', e.message);
    }
    try {
      if (this.loopbackStream) {
        this.loopbackStream.quit();
        this.loopbackStream = null;
      }
    } catch (e) {
      log.warn('[STEALTH-AI] loopback stop:', e.message);
    }
    this.vad.reset();
    log.info('[STEALTH-AI] Audio capture stopped');
  }
}

module.exports = { AudioCapture };

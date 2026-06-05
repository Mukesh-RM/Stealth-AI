const { calculateRms } = require('./audio-utils');

const DEFAULT_THRESHOLD = 0.006;
const MIN_SPEECH_MS = 200;
const SILENCE_MS = 600;

class VoiceActivityDetector {
  constructor(options = {}) {
    this.threshold = options.threshold ?? DEFAULT_THRESHOLD;
    this.minSpeechMs = options.minSpeechMs ?? MIN_SPEECH_MS;
    this.silenceMs = options.silenceMs ?? SILENCE_MS;
    this.sampleRate = options.sampleRate ?? 16000;
    this.isSpeaking = false;
    this.speechStart = null;
    this.lastSpeech = null;
    this.buffer = [];
  }

  processChunk(chunk) {
    const rms = calculateRms(chunk);
    const now = Date.now();
    const speaking = rms >= this.threshold;

    if (speaking) {
      this.lastSpeech = now;
      if (!this.isSpeaking) {
        this.speechStart = now;
        this.isSpeaking = true;
      }
      this.buffer.push(chunk);
      return { type: 'speech', rms, chunk };
    }

    if (this.isSpeaking) {
      this.buffer.push(chunk);
      const silentFor = now - (this.lastSpeech || now);
      const spokeLongEnough = (this.lastSpeech || now) - (this.speechStart || now) >= this.minSpeechMs;
      if (silentFor >= this.silenceMs && spokeLongEnough) {
        const audio = Buffer.concat(this.buffer);
        this.reset();
        return { type: 'segment', rms, audio };
      }
      return { type: 'trail', rms, chunk };
    }

    return { type: 'silence', rms, chunk };
  }

  reset() {
    this.isSpeaking = false;
    this.speechStart = null;
    this.lastSpeech = null;
    this.buffer = [];
  }

  flush() {
    if (this.buffer.length === 0) return null;
    const audio = Buffer.concat(this.buffer);
    this.reset();
    return audio;
  }
}

module.exports = { VoiceActivityDetector, DEFAULT_THRESHOLD };

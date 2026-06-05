const fs = require('fs');
const path = require('path');
const os = require('os');
const log = require('electron-log');
const { getApiKey, store } = require('../storage/store');
const { pcmToWav } = require('../audio/audio-utils');

function writeTempWav(wavBuffer) {
  const tmp = path.join(os.tmpdir(), `stealth-ai-${Date.now()}.wav`);
  fs.writeFileSync(tmp, wavBuffer);
  return tmp;
}

async function transcribeWithGroq(wavBuffer) {
  const key = getApiKey('groq');
  if (!key) throw new Error('Groq API key not configured — save your Groq key on API Keys');

  const tmp = writeTempWav(wavBuffer);
  try {
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: key });
    const result = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tmp),
      model: 'whisper-large-v3',
      language: 'en',
      temperature: 0,
    });
    const text =
      typeof result === 'string'
        ? result
        : (result.text || result?.segments?.map((s) => s.text).join(' ') || '');
    return text.trim();
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch (e) {
      log.warn('[STEALTH-AI] temp wav cleanup:', e.message);
    }
  }
}

async function transcribeWithOpenAI(wavBuffer) {
  const key = getApiKey('openai');
  if (!key) throw new Error('OpenAI API key not configured');

  const tmp = writeTempWav(wavBuffer);
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: key });
    const result = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmp),
      model: 'whisper-1',
    });
    return (result.text || '').trim();
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch (e) {
      log.warn('[STEALTH-AI] temp wav cleanup:', e.message);
    }
  }
}

async function transcribePcm(pcmBuffer) {
  const wav = pcmToWav(pcmBuffer);
  const provider = store.get('transcriptionProvider') || 'groq';

  try {
    if (provider === 'groq') {
      return await transcribeWithGroq(wav);
    }
    return await transcribeWithOpenAI(wav);
  } catch (primaryErr) {
    log.warn('[STEALTH-AI] Primary transcription failed, trying fallback:', primaryErr.message);
    try {
      if (provider === 'groq') {
        return await transcribeWithOpenAI(wav);
      }
      return await transcribeWithGroq(wav);
    } catch (fallbackErr) {
      log.error('[STEALTH-AI] All transcription providers failed:', fallbackErr.message);
      throw fallbackErr;
    }
  }
}

module.exports = { transcribePcm, transcribeWithGroq, transcribeWithOpenAI };

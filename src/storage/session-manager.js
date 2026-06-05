const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('electron-log');
const { APP_DIR } = require('./store');

const SESSIONS_DIR = path.join(APP_DIR, 'sessions');

function sessionPath(id) {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

function createSession(config) {
  try {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const session = {
      id,
      title: config.company
        ? `${config.company} — ${config.sessionType || 'Interview'}`
        : config.sessionType || 'Interview Session',
      description: (config.jobDescription || '').slice(0, 120),
      mode: config.sessionType || 'Interview',
      status: config.status || 'Active',
      aiUsage: 0,
      createdAt: now,
      updatedAt: now,
      config: {
        ...config,
        autoGenerate: config.autoGenerate !== false,
        saveTranscript: config.saveTranscript !== false,
      },
      transcript: [],
      qaPairs: [],
    };
    fs.writeFileSync(sessionPath(id), JSON.stringify(session, null, 2), 'utf8');
    log.info('[STEALTH-AI] Session created:', id);
    return session;
  } catch (err) {
    log.error('[STEALTH-AI] createSession failed:', err.message);
    throw err;
  }
}

function toSessionSummary(session) {
  return {
    id: session.id,
    title: session.title,
    description: session.description,
    mode: session.mode,
    status: session.status,
    aiUsage: session.aiUsage ?? 0,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function loadAllSessions({ summaryOnly = true } = {}) {
  try {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json'));
    const sessions = files
      .map((f) => {
        try {
          const session = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
          return summaryOnly ? toSessionSummary(session) : session;
        } catch (e) {
          log.warn('[STEALTH-AI] Bad session file:', f);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sessions;
  } catch (err) {
    log.error('[STEALTH-AI] loadAllSessions failed:', err.message);
    return [];
  }
}

function loadSession(id) {
  try {
    const raw = fs.readFileSync(sessionPath(id), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    log.error('[STEALTH-AI] loadSession failed:', err.message);
    return null;
  }
}

function saveSession(session) {
  try {
    session.updatedAt = new Date().toISOString();
    fs.writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2), 'utf8');
    return session;
  } catch (err) {
    log.error('[STEALTH-AI] saveSession failed:', err.message);
    throw err;
  }
}

function deleteSession(id) {
  try {
    const p = sessionPath(id);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  } catch (err) {
    log.error('[STEALTH-AI] deleteSession failed:', err.message);
    return false;
  }
}

function endSession(id) {
  const session = loadSession(id);
  if (!session) return null;
  session.status = 'Ended';
  return saveSession(session);
}

function appendTranscript(id, entry) {
  const session = loadSession(id);
  if (!session) return null;
  session.transcript = session.transcript || [];
  session.transcript.push({ ...entry, timestamp: new Date().toISOString() });
  return saveSession(session);
}

function appendQAPair(id, question, answer) {
  const session = loadSession(id);
  if (!session) return null;
  session.qaPairs = session.qaPairs || [];
  session.qaPairs.push({
    question,
    answer,
    timestamp: new Date().toISOString(),
  });
  session.aiUsage = (session.aiUsage || 0) + 1;
  return saveSession(session);
}

module.exports = {
  createSession,
  loadAllSessions,
  loadSession,
  saveSession,
  deleteSession,
  endSession,
  appendTranscript,
  appendQAPair,
};

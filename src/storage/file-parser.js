const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('electron-log');
const { APP_DIR } = require('./store');

const RESUMES_DIR = path.join(APP_DIR, 'resumes');
const DOCUMENTS_DIR = path.join(APP_DIR, 'documents');

function ensureDirs() {
  fs.mkdirSync(RESUMES_DIR, { recursive: true });
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

async function parsePdf(buffer) {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return (data.text || '').trim();
  } catch (err) {
    log.error('[STEALTH-AI] PDF parse failed:', err.message);
    throw new Error('Failed to parse PDF. Ensure the file is a valid PDF.');
  }
}

function saveResume({ title, text, filename, source }) {
  ensureDirs();
  const id = crypto.randomUUID();
  const meta = {
    id,
    title: title || filename || 'Untitled Resume',
    tags: source === 'pdf' ? ['PDF', 'Original PDF'] : ['Manual'],
    filename: filename || null,
    source: source || 'manual',
    createdAt: new Date().toISOString(),
  };
  const textPath = path.join(RESUMES_DIR, `${id}.txt`);
  const metaPath = path.join(RESUMES_DIR, `${id}.json`);
  fs.writeFileSync(textPath, text, 'utf8');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  if (source === 'pdf' && filename) {
    const pdfCopy = path.join(RESUMES_DIR, `${id}-${path.basename(filename)}`);
    try {
      if (fs.existsSync(filename)) {
        fs.copyFileSync(filename, pdfCopy);
        meta.pdfPath = pdfCopy;
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
      }
    } catch (e) {
      log.warn('[STEALTH-AI] PDF copy skipped:', e.message);
    }
  }
  return { ...meta, textPreview: text.slice(0, 200) };
}

function loadAllResumes({ includeText = false } = {}) {
  ensureDirs();
  const files = fs.readdirSync(RESUMES_DIR).filter((f) => f.endsWith('.json'));
  return files
    .map((f) => {
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(RESUMES_DIR, f), 'utf8'));
        if (includeText) {
          const textPath = path.join(RESUMES_DIR, `${meta.id}.txt`);
          if (fs.existsSync(textPath)) {
            meta.text = fs.readFileSync(textPath, 'utf8');
          }
        }
        return meta;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function deleteResume(id) {
  ensureDirs();
  const metaPath = path.join(RESUMES_DIR, `${id}.json`);
  const textPath = path.join(RESUMES_DIR, `${id}.txt`);
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
  if (fs.existsSync(textPath)) fs.unlinkSync(textPath);
  const extras = fs.readdirSync(RESUMES_DIR).filter((f) => f.startsWith(id));
  extras.forEach((f) => {
    try {
      fs.unlinkSync(path.join(RESUMES_DIR, f));
    } catch (e) {
      log.warn('[STEALTH-AI] deleteResume extra:', e.message);
    }
  });
  return true;
}

function getResumeText(id) {
  const textPath = path.join(RESUMES_DIR, `${id}.txt`);
  if (!fs.existsSync(textPath)) return '';
  return fs.readFileSync(textPath, 'utf8');
}

function saveDocument({ title, text, tags }) {
  ensureDirs();
  const id = crypto.randomUUID();
  const meta = {
    id,
    title: title || 'Untitled Document',
    tags: tags || [],
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(DOCUMENTS_DIR, `${id}.txt`), text, 'utf8');
  fs.writeFileSync(path.join(DOCUMENTS_DIR, `${id}.json`), JSON.stringify(meta, null, 2), 'utf8');
  return meta;
}

function loadAllDocuments({ includeText = false } = {}) {
  ensureDirs();
  return fs
    .readdirSync(DOCUMENTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const meta = JSON.parse(fs.readFileSync(path.join(DOCUMENTS_DIR, f), 'utf8'));
        if (includeText) {
          const tp = path.join(DOCUMENTS_DIR, `${meta.id}.txt`);
          if (fs.existsSync(tp)) meta.text = fs.readFileSync(tp, 'utf8');
        }
        return meta;
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function deleteDocument(id) {
  ensureDirs();
  const jp = path.join(DOCUMENTS_DIR, `${id}.json`);
  const tp = path.join(DOCUMENTS_DIR, `${id}.txt`);
  if (fs.existsSync(jp)) fs.unlinkSync(jp);
  if (fs.existsSync(tp)) fs.unlinkSync(tp);
  return true;
}

function getDocumentText(id) {
  const tp = path.join(DOCUMENTS_DIR, `${id}.txt`);
  if (!fs.existsSync(tp)) return '';
  return fs.readFileSync(tp, 'utf8');
}

module.exports = {
  parsePdf,
  saveResume,
  loadAllResumes,
  deleteResume,
  getResumeText,
  saveDocument,
  loadAllDocuments,
  deleteDocument,
  getDocumentText,
  RESUMES_DIR,
  DOCUMENTS_DIR,
};

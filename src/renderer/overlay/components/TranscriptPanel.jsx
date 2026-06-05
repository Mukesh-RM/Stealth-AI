import React, { useState } from 'react';

export default function TranscriptPanel({ lines, status, error }) {
  const [open, setOpen] = useState(true);
  let text = lines.length ? lines.join('\n') : 'Listening for speech… (allow mic when prompted)';
  if (status === 'processing') {
    text = lines.length ? `${lines.join('\n')}\n\n⏳ Transcribing…` : '⏳ Transcribing…';
  }
  if (error && !error.includes('arecord')) {
    text = `⚠️ ${error}\n\n${text}`;
  }

  return (
    <div className="panel">
      <button type="button" className="panel-header" onClick={() => setOpen(!open)}>
        <span>📝 Transcript</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="panel-body">{text}</div>}
    </div>
  );
}

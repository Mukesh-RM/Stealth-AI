import React from 'react';

export default function AudioIndicator({ level, recording }) {
  const bars = 5;
  const activeCount = Math.min(bars, Math.floor((level || 0) * 40) + (recording ? 1 : 0));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className={`rec-dot${recording ? ' recording' : ''}`} />
      <div className="audio-bars">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={`audio-bar${i < activeCount ? ' active' : ''}`}
            style={{ height: 4 + (i + 1) * 2 }}
          />
        ))}
      </div>
    </div>
  );
}

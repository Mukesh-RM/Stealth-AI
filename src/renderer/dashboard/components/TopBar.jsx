import React, { memo } from 'react';

function TopBar({ settings, onStartSession }) {
  const freeLeft = settings?.freeSessionsLeft ?? 5;

  return (
    <header className="topbar">
      <span className="free-sessions-text">
        Start Free Session (<strong>{freeLeft}</strong> left)
      </span>
      <button type="button" className="btn btn-primary" onClick={onStartSession}>
        Start Session
      </button>
    </header>
  );
}

export default memo(TopBar);

import React from 'react';

export default function HotkeyBar({ elapsed, onCopy, onRegen }) {
  return (
    <div className="hotkey-bar">
      <div className="hotkey-actions">
        {elapsed && <span className="meta-time">⏱ {elapsed}s</span>}
        <button type="button" className="action-btn" onClick={onCopy}>
          📋 Copy
        </button>
        <button type="button" className="action-btn" onClick={onRegen}>
          🔄 Regen
        </button>
      </div>
      <div className="hotkey-hints">
        <span>
          <kbd>^H</kbd> hide
        </span>
        <span>
          <kbd>^A</kbd> answer
        </span>
        <span>
          <kbd>^C</kbd> copy
        </span>
        <span>
          <kbd>^R</kbd> regen
        </span>
      </div>
    </div>
  );
}

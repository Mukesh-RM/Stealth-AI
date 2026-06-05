import React, { memo, useRef, useEffect, useCallback } from 'react';
import AudioIndicator from './AudioIndicator';

function DragHandle({ level, recording, onMinimize, onClose }) {
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    const dx = e.screenX - last.current.x;
    const dy = e.screenY - last.current.y;
    last.current = { x: e.screenX, y: e.screenY };
    window.stealthAPI.window.move(dx, dy);
  }, []);

  const onMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragging.current = true;
    last.current = { x: e.screenX, y: e.screenY };
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div className="drag-bar" onMouseDown={onMouseDown}>
      <AudioIndicator level={level} recording={recording} />
      <span className="brand-title">STEALTH-AI</span>
      <button
        type="button"
        className="win-btn"
        title="Settings"
        onClick={() => window.stealthAPI.window.showDashboard()}
      >
        ⚙
      </button>
      <button type="button" className="win-btn" title="Minimize" onClick={onMinimize}>
        —
      </button>
      <button type="button" className="win-btn" title="Hide" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

export default memo(DragHandle);

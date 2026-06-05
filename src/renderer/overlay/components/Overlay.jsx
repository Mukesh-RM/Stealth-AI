import React from 'react';
import DragHandle from './DragHandle';
import TranscriptPanel from './TranscriptPanel';
import AnswerPanel from './AnswerPanel';
import HotkeyBar from './HotkeyBar';

export default function Overlay({
  transcriptLines,
  transcriptStatus,
  transcriptError,
  answer,
  streaming,
  elapsed,
  level,
  recording,
  onCopy,
  onRegen,
}) {
  return (
    <div className="overlay-shell">
      <DragHandle
        level={level}
        recording={recording}
        onMinimize={() => window.stealthAPI.window.minimizeOverlay()}
        onClose={() => window.stealthAPI.window.closeOverlay()}
      />
      <TranscriptPanel
        lines={transcriptLines}
        status={transcriptStatus}
        error={transcriptError}
      />
      <AnswerPanel answer={answer} streaming={streaming} />
      <HotkeyBar elapsed={elapsed} onCopy={onCopy} onRegen={onRegen} />
    </div>
  );
}

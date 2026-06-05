import React, { useEffect, useRef } from 'react';

export default function AnswerPanel({ answer, streaming }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [answer]);

  return (
    <div className="answer-panel">
      <div className="answer-header">🤖 AI Answer</div>
      <div ref={ref} className={`answer-body${streaming ? ' streaming' : ''}`}>
        {answer || 'Press Ctrl+Shift+A or wait for auto-generate when a question is detected.'}
        {streaming && <span className="cursor-blink" />}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';

export function useAI(transcriptText) {
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [elapsed, setElapsed] = useState('');

  const trigger = useCallback(() => {
    setAnswer('');
    setStreaming(true);
    window.stealthAPI.ai.trigger({
      transcript: transcriptText,
    });
  }, [transcriptText]);

  const regen = useCallback(() => {
    setAnswer('');
    setStreaming(true);
    window.stealthAPI.ai.regenerate({
      transcript: transcriptText,
    });
  }, [transcriptText]);

  const copy = useCallback(async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
    } catch {
      window.stealthAPI.send?.('overlay:copy-fallback', { answer });
    }
  }, [answer]);

  useEffect(() => {
    const unsubStart = window.stealthAPI.on('ai:stream-start', () => {
      setStreaming(true);
      setAnswer('');
    });

    const unsubToken = window.stealthAPI.on('ai:stream-token', ({ token }) => {
      setAnswer((prev) => prev + (token || ''));
    });

    const unsubDone = window.stealthAPI.on('ai:stream-complete', ({ full, elapsed: e }) => {
      setAnswer(full || '');
      setStreaming(false);
      setElapsed(e || '');
      window.stealthAPI.send('overlay:set-last-answer', {
        answer: full,
        question: transcriptText,
      });
    });

    const unsubErr = window.stealthAPI.on('ai:stream-error', ({ message }) => {
      setAnswer(`Error: ${message}`);
      setStreaming(false);
    });

    const unsubHotkeyA = window.stealthAPI.on('hotkey:answer', trigger);
    const unsubHotkeyR = window.stealthAPI.on('hotkey:regen', regen);
    const unsubHotkeyC = window.stealthAPI.on('hotkey:copy', copy);

    return () => {
      unsubStart?.();
      unsubToken?.();
      unsubDone?.();
      unsubErr?.();
      unsubHotkeyA?.();
      unsubHotkeyR?.();
      unsubHotkeyC?.();
    };
  }, [trigger, regen, copy, transcriptText]);

  return { answer, streaming, elapsed, trigger, regen, copy };
}

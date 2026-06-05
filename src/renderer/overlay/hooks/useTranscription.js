import { useState, useEffect } from 'react';

export function useTranscription() {
  const [lines, setLines] = useState([]);
  const [statusMessage, setStatusMessage] = useState('listening');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const unsubChunk = window.stealthAPI.on('transcription:chunk', ({ text }) => {
      if (text) {
        setErrorMessage('');
        setLines((prev) => [...prev.slice(-20), text]);
      }
    });

    const unsubQ = window.stealthAPI.on('transcription:question-detected', ({ text }) => {
      if (text) {
        setLines((prev) => [...prev.slice(-20), `[Q] ${text}`]);
      }
    });

    const unsubStatus = window.stealthAPI.on('transcription:status', ({ state }) => {
      if (state) setStatusMessage(state);
    });

    const unsubErr = window.stealthAPI.on('transcription:error', ({ message }) => {
      if (message) setErrorMessage(message);
    });

    const unsubAudio = window.stealthAPI.on('audio:status', (status) => {
      if (status?.ok === true) {
        setErrorMessage('');
        setStatusMessage('listening');
        return;
      }
      if (status?.ok === false && status?.message && !status.message.includes('arecord')) {
        setErrorMessage(status.message);
      }
    });

    return () => {
      unsubChunk?.();
      unsubQ?.();
      unsubStatus?.();
      unsubErr?.();
      unsubAudio?.();
    };
  }, []);

  return { lines, transcriptText: lines.join('\n'), statusMessage, errorMessage };
}

import { useState, useEffect } from 'react';

export function useAudio() {
  const [level, setLevel] = useState(0);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const unsubLevel = window.stealthAPI.on('audio:level-update', ({ level: l }) => {
      setLevel(l || 0);
    });
    const unsubSession = window.stealthAPI.on('session:active', () => {
      setRecording(true);
    });

    return () => {
      unsubLevel?.();
      unsubSession?.();
      window.stealthAPI.audio.stop();
    };
  }, []);

  return { level, recording };
}

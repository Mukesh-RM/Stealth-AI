import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/overlay.css';
import Overlay from './components/Overlay';
import { useState, useEffect } from 'react';
import { useAudio } from './hooks/useAudio';
import { useRendererMic } from './hooks/useRendererMic';
import { useTranscription } from './hooks/useTranscription';
import { useAI } from './hooks/useAI';

function OverlayApp() {
  const [preferRendererMic, setPreferRendererMic] = useState(true);

  useEffect(() => {
    window.stealthAPI.bootstrap?.().then((data) => {
      if (data?.preferRendererMic != null) {
        setPreferRendererMic(data.preferRendererMic);
      }
    });
  }, []);

  const { level, recording } = useAudio();
  useRendererMic(preferRendererMic && recording);
  const { lines, transcriptText, statusMessage, errorMessage } = useTranscription();
  const { answer, streaming, elapsed, copy, regen } = useAI(transcriptText);

  return (
    <Overlay
      transcriptLines={lines}
      transcriptStatus={statusMessage}
      transcriptError={errorMessage}
      answer={answer}
      streaming={streaming}
      elapsed={elapsed}
      level={level}
      recording={recording}
      onCopy={copy}
      onRegen={regen}
    />
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<OverlayApp />);

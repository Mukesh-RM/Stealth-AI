import { useEffect, useRef } from 'react';
import { acquireMicStream, float32ToInt16AtRate, TARGET_RATE } from './micStream';

const CHUNK_SECONDS = 3;

/**
 * Captures mic in the overlay via Web Audio (primary path on Linux).
 */
export function useRendererMic(enabled) {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    let stream = null;
    let ctx = null;
    let processor = null;
    let cancelled = false;

    const start = async () => {
      try {
        stream = await acquireMicStream();
        if (cancelled) return;

        runningRef.current = true;
        ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const inputRate = ctx.sampleRate;
        const chunkSamples = Math.floor(TARGET_RATE * CHUNK_SECONDS);

        const source = ctx.createMediaStreamSource(stream);
        processor = ctx.createScriptProcessor(4096, 1, 1);
        const silent = ctx.createGain();
        silent.gain.value = 0;

        let pending = [];
        let pendingSamples = 0;

        processor.onaudioprocess = (event) => {
          if (cancelled || !runningRef.current) return;
          const input = event.inputBuffer.getChannelData(0);
          const int16 = float32ToInt16AtRate(input, inputRate, TARGET_RATE);

          let sum = 0;
          for (let i = 0; i < input.length; i += 1) {
            sum += input[i] * input[i];
          }
          const rms = Math.sqrt(sum / input.length);
          window.stealthAPI.audio.sendLevel?.(rms);

          pending.push(int16);
          pendingSamples += int16.length;

          if (pendingSamples >= chunkSamples) {
            const merged = new Int16Array(pendingSamples);
            let offset = 0;
            for (const part of pending) {
              merged.set(part, offset);
              offset += part.length;
            }
            pending = [];
            pendingSamples = 0;
            if (rms >= 0.001) {
              window.stealthAPI.audio.sendPcmChunk(merged.buffer);
            }
          }
        };

        source.connect(processor);
        processor.connect(silent);
        silent.connect(ctx.destination);

        window.stealthAPI.audio.sendStatus?.({ state: 'mic-ok', source: 'browser' });
      } catch (err) {
        window.stealthAPI.audio.sendStatus?.({
          state: 'mic-error',
          message: err.message || 'Microphone unavailable',
        });
      }
    };

    const timer = setTimeout(start, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      runningRef.current = false;
      try {
        processor?.disconnect();
      } catch (e) {
        /* ignore */
      }
      try {
        ctx?.close();
      } catch (e) {
        /* ignore */
      }
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled]);

  return runningRef;
}

const TARGET_RATE = 16000;

/**
 * Try several getUserMedia strategies (strict constraints often fail on Linux/PipeWire).
 */
export async function acquireMicStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone API not available. Restart the app.');
  }

  let lastError = null;

  const tryGet = async (constraints) => {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
      return null;
    }
  };

  let stream = await tryGet({ audio: true, video: false });
  if (stream) return stream;

  stream = await tryGet({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: false,
  });
  if (stream) return stream;

  try {
    let devices = await navigator.mediaDevices.enumerateDevices();
    let inputs = devices.filter((d) => d.kind === 'audioinput');

    if (!inputs.length || inputs.every((d) => !d.label)) {
      stream = await tryGet({ audio: true, video: false });
      if (stream) {
        devices = await navigator.mediaDevices.enumerateDevices();
        inputs = devices.filter((d) => d.kind === 'audioinput');
      }
    }

    for (const input of inputs) {
      if (!input.deviceId) continue;
      stream = await tryGet({
        audio: { deviceId: { ideal: input.deviceId } },
        video: false,
      });
      if (stream) return stream;

      stream = await tryGet({
        audio: { deviceId: input.deviceId },
        video: false,
      });
      if (stream) return stream;
    }
  } catch (err) {
    lastError = err;
  }

  const name = lastError?.name || '';
  const msg = lastError?.message || 'No microphone found';

  if (name === 'NotFoundError' || msg.includes('device not found')) {
    throw new Error(
      'No microphone detected. Plug in a headset/USB mic, set a default input in system sound settings, then restart the session.'
    );
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    throw new Error('Microphone blocked. Allow mic access for Stealth AI in system settings, then try again.');
  }

  throw new Error(msg);
}

export function float32ToInt16AtRate(float32, inputRate, targetRate = TARGET_RATE) {
  if (inputRate === targetRate) {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i += 1) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16;
  }

  const ratio = inputRate / targetRate;
  const outLen = Math.max(1, Math.floor(float32.length / ratio));
  const int16 = new Int16Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const idx = Math.min(float32.length - 1, Math.floor(i * ratio));
    const s = Math.max(-1, Math.min(1, float32[idx]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

export { TARGET_RATE };

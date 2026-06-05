const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;

function pcmToWav(pcmBuffer, sampleRate = SAMPLE_RATE, channels = CHANNELS) {
  const byteRate = sampleRate * channels * BYTES_PER_SAMPLE;
  const blockAlign = channels * BYTES_PER_SAMPLE;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

function mergeBuffers(buffers) {
  return Buffer.concat(buffers);
}

function calculateRms(chunk) {
  if (!chunk || chunk.length < 2) return 0;
  let sum = 0;
  const samples = chunk.length / 2;
  for (let i = 0; i < chunk.length; i += 2) {
    const sample = chunk.readInt16LE(i) / 32768;
    sum += sample * sample;
  }
  return Math.sqrt(sum / samples);
}

module.exports = {
  SAMPLE_RATE,
  CHANNELS,
  BYTES_PER_SAMPLE,
  pcmToWav,
  bufferToBase64,
  mergeBuffers,
  calculateRms,
};

// Synchronous linear interpolation resampling to 16kHz.
export function resampleTo16kSync(audioData: Float32Array, originalSampleRate: number): Float32Array {
  if (originalSampleRate === 16000) return audioData;

  const targetSampleRate = 16000;
  const ratio = originalSampleRate / targetSampleRate;
  const outputLength = Math.floor(audioData.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const sourceIndex = i * ratio;
    const sourceFloor = Math.floor(sourceIndex);
    const sourceCeil = Math.min(sourceFloor + 1, audioData.length - 1);
    const fraction = sourceIndex - sourceFloor;
    output[i] = audioData[sourceFloor] * (1 - fraction) + audioData[sourceCeil] * fraction;
  }

  return output;
}

// Encode Float32 samples to little-endian PCM16.
export function encodeFloat32ToPcm16le(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  let offset = 0;

  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

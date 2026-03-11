/**
 * BPM 偵測 Web Worker
 * 演算法：降採樣 → 能量包絡 → 自相關 → 在 60-200 BPM 範圍找峰值
 */

interface BpmWorkerMessage {
  channelData: Float32Array;
  sampleRate: number;
}

const BPM_MIN = 60;
const BPM_MAX = 200;
const TARGET_SAMPLE_RATE = 11025;

function downsample(data: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate <= toRate) {
    return data;
  }
  const ratio = fromRate / toRate;
  const length = Math.floor(data.length / ratio);
  const result = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = data[Math.floor(i * ratio)];
  }
  return result;
}

function computeEnergyEnvelope(data: Float32Array, hopSize: number): Float32Array {
  const length = Math.floor(data.length / hopSize);
  const envelope = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    const start = i * hopSize;
    const end = Math.min(start + hopSize, data.length);
    for (let j = start; j < end; j++) {
      sum += data[j] * data[j];
    }
    envelope[i] = sum / (end - start);
  }
  return envelope;
}

function autocorrelation(
  envelope: Float32Array,
  sampleRate: number,
  hopSize: number,
): { bpm: number; confidence: number } | null {
  const envelopeRate = sampleRate / hopSize;
  const minLag = Math.floor(envelopeRate * (60 / BPM_MAX));
  const maxLag = Math.ceil(envelopeRate * (60 / BPM_MIN));

  if (maxLag >= envelope.length) {
    return null;
  }

  // 計算均值
  let mean = 0;
  for (let i = 0; i < envelope.length; i++) {
    mean += envelope[i];
  }
  mean /= envelope.length;

  // 自相關
  let bestLag = minLag;
  let bestCorr = -Infinity;
  let zeroLagCorr = 0;

  // 計算 zero-lag 自相關（用於歸一化）
  for (let i = 0; i < envelope.length - maxLag; i++) {
    const v = envelope[i] - mean;
    zeroLagCorr += v * v;
  }

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    const n = envelope.length - maxLag;
    for (let i = 0; i < n; i++) {
      corr += (envelope[i] - mean) * (envelope[i + lag] - mean);
    }

    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  const bpm = (envelopeRate / bestLag) * 60;
  const confidence = zeroLagCorr > 0 ? bestCorr / zeroLagCorr : 0;

  return { bpm, confidence };
}

/**
 * 修正倍數問題：偏好 80-160 BPM 範圍
 */
function adjustBpmOctave(bpm: number): number {
  const PREFERRED_MIN = 80;
  const PREFERRED_MAX = 160;

  let adjusted = bpm;
  while (adjusted > PREFERRED_MAX && adjusted / 2 >= BPM_MIN) {
    adjusted /= 2;
  }
  while (adjusted < PREFERRED_MIN && adjusted * 2 <= BPM_MAX) {
    adjusted *= 2;
  }
  return Math.round(adjusted * 10) / 10;
}

self.onmessage = (event: MessageEvent<BpmWorkerMessage>) => {
  const { channelData, sampleRate } = event.data;

  try {
    const downsampled = downsample(channelData, sampleRate, TARGET_SAMPLE_RATE);
    const effectiveRate = Math.min(sampleRate, TARGET_SAMPLE_RATE);
    const hopSize = Math.floor(effectiveRate / 20); // ~50ms hops
    const envelope = computeEnergyEnvelope(downsampled, hopSize);
    const result = autocorrelation(envelope, effectiveRate, hopSize);

    if (!result || result.confidence < 0.01) {
      self.postMessage({ bpm: null });
      return;
    }

    const bpm = adjustBpmOctave(result.bpm);
    self.postMessage({ bpm });
  } catch {
    self.postMessage({ bpm: null });
  }
};

import { clamp } from "./helpers";

const MP3_BITRATE = 192;
const MP3_BLOCK_SIZE = 1152;

export type PitchShifterLike = {
  pitch: number;
  tempo: number;
  percentagePlayed: number;
  connect: (toNode: AudioNode) => void;
  disconnect: () => void;
  on: (eventName: string, cb: (detail: { timePlayed: number }) => void) => void;
  off: (eventName?: string | null) => void;
};

export async function renderProcessedAudioBuffer(
  source: AudioBuffer,
  semitoneShift: number,
  tempoRatio: number
): Promise<AudioBuffer> {
  const { PitchShifter } = await import("soundtouchjs");
  const outputChannels = clamp(source.numberOfChannels, 1, 2);
  const outputLength = Math.max(1, Math.ceil((source.duration / tempoRatio) * source.sampleRate) + 2048);
  const offlineContext = new OfflineAudioContext(outputChannels, outputLength, source.sampleRate);
  const shifter = new PitchShifter(offlineContext, source, 1024) as PitchShifterLike;

  shifter.pitch = Math.pow(2, semitoneShift / 12);
  shifter.tempo = tempoRatio;
  shifter.percentagePlayed = 0;
  shifter.connect(offlineContext.destination);

  const rendered = await offlineContext.startRendering();
  shifter.disconnect();
  shifter.off("play");
  return rendered;
}

export async function renderMp3Blob(audio: AudioBuffer): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");

  const channels = clamp(audio.numberOfChannels, 1, 2);
  const encoder = new Mp3Encoder(channels, audio.sampleRate, MP3_BITRATE);
  const leftSamples = floatToInt16(audio.getChannelData(0));
  const rightSamples =
    channels > 1
      ? floatToInt16(audio.getChannelData(1))
      : new Int16Array(leftSamples.length);

  const chunks: ArrayBuffer[] = [];

  for (let i = 0; i < leftSamples.length; i += MP3_BLOCK_SIZE) {
    const leftChunk = leftSamples.subarray(i, i + MP3_BLOCK_SIZE);
    const encoded =
      channels > 1
        ? encoder.encodeBuffer(leftChunk, rightSamples.subarray(i, i + MP3_BLOCK_SIZE))
        : encoder.encodeBuffer(leftChunk);

    if (encoded.length > 0) {
      chunks.push(Uint8Array.from(encoded).buffer);
    }
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) {
    chunks.push(Uint8Array.from(flushed).buffer);
  }

  return new Blob(chunks, { type: "audio/mpeg" });
}

function floatToInt16(channelData: Float32Array): Int16Array {
  const result = new Int16Array(channelData.length);

  for (let i = 0; i < channelData.length; i += 1) {
    const sample = clamp(channelData[i], -1, 1);
    result[i] = sample < 0 ? sample * 32768 : sample * 32767;
  }

  return result;
}

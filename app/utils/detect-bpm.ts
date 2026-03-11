const TIMEOUT_MS = 10_000;
const MIN_DURATION_SECONDS = 3;

export function detectBpm(audioBuffer: AudioBuffer): Promise<number | null> {
  if (audioBuffer.duration < MIN_DURATION_SECONDS) {
    return Promise.resolve(null);
  }

  return new Promise<number | null>((resolve) => {
    const worker = new Worker(
      new URL("../workers/bpm-worker.ts", import.meta.url),
      { type: "module" },
    );

    const timer = setTimeout(() => {
      worker.terminate();
      resolve(null);
    }, TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<{ bpm: number | null }>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(event.data.bpm);
    };

    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      resolve(null);
    };

    // 複製 channel data 以便 transfer
    const raw = audioBuffer.getChannelData(0);
    const channelData = raw.slice();
    worker.postMessage(
      { channelData, sampleRate: audioBuffer.sampleRate },
      [channelData.buffer],
    );
  });
}

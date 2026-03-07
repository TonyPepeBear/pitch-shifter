import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import type { Route } from "./+types/home";

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MANUAL_SHIFT_MIN = -12;
const MANUAL_SHIFT_MAX = 12;
const MP3_BITRATE = 192;
const MP3_BLOCK_SIZE = 1152;
const PREVIEW_SAMPLE_RATE = 44100;

type AudioContextCtor = new () => AudioContext;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "音訊變調器 | Pitch Shifter" },
    {
      name: "description",
      content: "上傳音樂、設定原調與目標調性，預覽後匯出 MP3。",
    },
  ];
}

export default function Home() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDecoding, setIsDecoding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [baseKey, setBaseKey] = useState("C");
  const [targetKey, setTargetKey] = useState("C");
  const [manualShift, setManualShift] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadSeconds, setPlayheadSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playheadRafRef = useRef<number | null>(null);
  const startContextTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const isPlayingRef = useRef(false);
  const playheadRef = useRef(0);
  const playbackRateRef = useRef(1);
  const playheadLoopRef = useRef<() => void>(() => undefined);

  const keyShift = useMemo(
    () => getClosestSemitoneDistance(baseKey, targetKey),
    [baseKey, targetKey]
  );

  const totalSemitoneShift = useMemo(
    () => keyShift + manualShift,
    [keyShift, manualShift]
  );

  const playbackRate = useMemo(
    () => Math.pow(2, totalSemitoneShift / 12),
    [totalSemitoneShift]
  );

  const processedDuration = useMemo(() => {
    if (!audioBuffer) {
      return 0;
    }
    return audioBuffer.duration / playbackRate;
  }, [audioBuffer, playbackRate]);

  const canExport = Boolean(audioBuffer) && !isExporting && !isDecoding;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playheadRef.current = playheadSeconds;
  }, [playheadSeconds]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  const cancelPlayheadLoop = useCallback(() => {
    if (playheadRafRef.current !== null) {
      window.cancelAnimationFrame(playheadRafRef.current);
      playheadRafRef.current = null;
    }
  }, []);

  const stopSourceNode = useCallback(() => {
    if (!sourceNodeRef.current) {
      return;
    }

    sourceNodeRef.current.onended = null;
    try {
      sourceNodeRef.current.stop();
    } catch {}
    sourceNodeRef.current.disconnect();
    sourceNodeRef.current = null;
  }, []);

  const stopPlayback = useCallback(
    (resetPlayhead: boolean) => {
      stopSourceNode();
      cancelPlayheadLoop();
      setIsPlaying(false);
      isPlayingRef.current = false;

      if (resetPlayhead) {
        startOffsetRef.current = 0;
        playheadRef.current = 0;
        setPlayheadSeconds(0);
      }
    },
    [cancelPlayheadLoop, stopSourceNode]
  );

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === "undefined") {
      throw new Error("目前環境不支援音訊功能");
    }

    if (!audioContextRef.current) {
      const ctor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;

      if (!ctor) {
        throw new Error("瀏覽器不支援 Web Audio API");
      }

      audioContextRef.current = new ctor();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  playheadLoopRef.current = () => {
    const context = audioContextRef.current;

    if (!context || !sourceNodeRef.current || !audioBuffer || !isPlayingRef.current) {
      return;
    }

    const elapsed = context.currentTime - startContextTimeRef.current;
    const currentOffset = startOffsetRef.current + elapsed * playbackRateRef.current;

    if (currentOffset >= audioBuffer.duration) {
      stopSourceNode();
      cancelPlayheadLoop();
      startOffsetRef.current = 0;
      playheadRef.current = 0;
      setPlayheadSeconds(0);
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    const nextPlayhead = currentOffset / playbackRateRef.current;
    playheadRef.current = nextPlayhead;
    setPlayheadSeconds(nextPlayhead);
    playheadRafRef.current = window.requestAnimationFrame(playheadLoopRef.current);
  };

  const startPlayback = useCallback(
    async (fromProcessedTime?: number) => {
      if (!audioBuffer) {
        return;
      }

      const context = await ensureAudioContext();
      stopSourceNode();
      cancelPlayheadLoop();

      const rawOffset = (fromProcessedTime ?? playheadRef.current) * playbackRateRef.current;
      const offset = clamp(rawOffset, 0, audioBuffer.duration);

      if (offset >= audioBuffer.duration) {
        startOffsetRef.current = 0;
        playheadRef.current = 0;
        setPlayheadSeconds(0);
        return;
      }

      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRateRef.current;
      source.connect(context.destination);
      source.onended = () => {
        if (!isPlayingRef.current) {
          return;
        }

        sourceNodeRef.current = null;
        cancelPlayheadLoop();
        startOffsetRef.current = 0;
        playheadRef.current = 0;
        setPlayheadSeconds(0);
        setIsPlaying(false);
        isPlayingRef.current = false;
      };

      source.start(0, offset);
      sourceNodeRef.current = source;
      startOffsetRef.current = offset;
      startContextTimeRef.current = context.currentTime;

      const initialPlayhead = offset / playbackRateRef.current;
      playheadRef.current = initialPlayhead;
      setPlayheadSeconds(initialPlayhead);
      setIsPlaying(true);
      isPlayingRef.current = true;
      playheadRafRef.current = window.requestAnimationFrame(playheadLoopRef.current);
    },
    [audioBuffer, cancelPlayheadLoop, ensureAudioContext, stopSourceNode]
  );

  const pausePlayback = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current || !sourceNodeRef.current) {
      return;
    }

    const elapsed = audioContextRef.current.currentTime - startContextTimeRef.current;
    const currentOffset = clamp(
      startOffsetRef.current + elapsed * playbackRateRef.current,
      0,
      audioBuffer.duration
    );

    stopSourceNode();
    cancelPlayheadLoop();

    startOffsetRef.current = currentOffset;
    const nextPlayhead = currentOffset / playbackRateRef.current;
    playheadRef.current = nextPlayhead;
    setPlayheadSeconds(nextPlayhead);
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, [audioBuffer, cancelPlayheadLoop, stopSourceNode]);

  useEffect(() => {
    if (!audioBuffer) {
      return;
    }

    const maxPlayhead = audioBuffer.duration / playbackRate;
    if (playheadRef.current > maxPlayhead) {
      playheadRef.current = maxPlayhead;
      startOffsetRef.current = maxPlayhead * playbackRate;
      setPlayheadSeconds(maxPlayhead);
    }
  }, [audioBuffer, playbackRate]);

  useEffect(() => {
    if (!audioBuffer || !isPlayingRef.current) {
      return;
    }

    const keepPosition = playheadRef.current;
    void startPlayback(keepPosition);
  }, [audioBuffer, playbackRate, startPlayback]);

  useEffect(() => {
    return () => {
      stopPlayback(true);
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, [stopPlayback]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const loadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("audio/")) {
        setErrorMessage("請選擇音訊檔案（例如 MP3、WAV、OGG）");
        setStatusMessage(null);
        return;
      }

      setIsDecoding(true);
      setErrorMessage(null);
      setStatusMessage(null);

      try {
        stopPlayback(true);

        const context = await ensureAudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const decoded = await context.decodeAudioData(arrayBuffer.slice(0));

        setAudioBuffer(decoded);
        setFileName(file.name);
        setStatusMessage(`已載入：${file.name}`);
      } catch (error) {
        console.error(error);
        setErrorMessage("音訊解析失敗，請確認檔案格式是否正確");
        setAudioBuffer(null);
        setFileName("");
      } finally {
        setIsDecoding(false);
      }
    },
    [ensureAudioContext, stopPlayback]
  );

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile) {
      await loadFile(nextFile);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) {
      await loadFile(nextFile);
    }
  };

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const nextPlayhead = Number(event.target.value);
    const safePlayhead = clamp(nextPlayhead, 0, processedDuration);

    playheadRef.current = safePlayhead;
    startOffsetRef.current = safePlayhead * playbackRateRef.current;
    setPlayheadSeconds(safePlayhead);

    if (isPlayingRef.current) {
      void startPlayback(safePlayhead);
    }
  };

  const handleExport = async () => {
    if (!audioBuffer || !fileName) {
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const outputChannels = clamp(audioBuffer.numberOfChannels, 1, 2);
      const outputLength = Math.max(
        1,
        Math.ceil((audioBuffer.duration / playbackRate) * PREVIEW_SAMPLE_RATE)
      );
      const offlineContext = new OfflineAudioContext(
        outputChannels,
        outputLength,
        PREVIEW_SAMPLE_RATE
      );
      const source = offlineContext.createBufferSource();

      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      source.connect(offlineContext.destination);
      source.start(0);

      const renderedBuffer = await offlineContext.startRendering();
      const mp3Blob = await renderMp3Blob(renderedBuffer);
      const exportName = buildExportFileName(fileName, totalSemitoneShift);

      triggerDownload(mp3Blob, exportName);
      setStatusMessage(`匯出完成：${exportName}`);
    } catch (error) {
      console.error(error);
      setErrorMessage("MP3 匯出失敗，請稍後再試");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePlayToggle = () => {
    if (!audioBuffer) {
      return;
    }

    if (isPlaying) {
      pausePlayback();
      return;
    }

    void startPlayback();
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <section className="mx-auto w-full max-w-4xl">
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_32px_90px_-44px_rgba(49,46,129,0.65)] backdrop-blur">
          <header className="px-6 pb-8 pt-10 text-center sm:px-10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <MusicIcon />
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              音訊變調器
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
              上傳您的音樂，設定原調與目標調性，立即預覽升降調結果並匯出 MP3。
            </p>
          </header>

          <div className="space-y-8 px-6 pb-8 sm:px-10">
            <div
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFilePicker();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition duration-200 ${
                isDragging
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-indigo-200 bg-indigo-50/60 hover:border-indigo-400 hover:bg-indigo-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(event) => {
                  void handleFileInputChange(event);
                }}
              />

              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-indigo-500 shadow-sm">
                <UploadIcon />
              </div>

              <p className="text-sm font-semibold text-slate-700 sm:text-base">
                {fileName || "點擊或拖曳音訊檔到這裡"}
              </p>
              <p className="mt-1 text-xs text-slate-500">支援 MP3、WAV、OGG、M4A</p>
              {isDecoding && <p className="mt-3 text-sm font-medium text-indigo-600">正在解析音訊...</p>}
            </div>

            {audioBuffer ? (
              <div className="space-y-6">
                <section className="rounded-2xl border border-indigo-100 bg-indigo-50/55 p-5 sm:p-6">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => stopPlayback(true)}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                      aria-label="停止播放"
                    >
                      <StopIcon />
                    </button>

                    <button
                      type="button"
                      onClick={handlePlayToggle}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-700"
                      aria-label={isPlaying ? "暫停播放" : "播放"}
                    >
                      {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                  </div>

                  <div className="mt-5 space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={processedDuration || 0}
                      step={0.01}
                      value={playheadSeconds}
                      onChange={handleSeek}
                      className="progress-slider h-2 w-full"
                    />
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>{formatTime(playheadSeconds)}</span>
                      <span>{formatTime(processedDuration)}</span>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <KeySelector
                    title="原調"
                    selectedKey={baseKey}
                    onChange={setBaseKey}
                    activeClassName="bg-slate-900 text-white border-slate-900"
                  />

                  <KeySelector
                    title="目標調性"
                    selectedKey={targetKey}
                    onChange={setTargetKey}
                    activeClassName="bg-indigo-600 text-white border-indigo-600"
                  />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">微調（半音）</p>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                      {formatSigned(manualShift)}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={MANUAL_SHIFT_MIN}
                    max={MANUAL_SHIFT_MAX}
                    step={1}
                    value={manualShift}
                    onChange={(event) => {
                      setManualShift(Number(event.target.value));
                    }}
                    className="pitch-slider mt-4 h-2 w-full"
                  />

                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>{MANUAL_SHIFT_MIN}</span>
                    <span>0</span>
                    <span>+{MANUAL_SHIFT_MAX}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setManualShift((value) => Math.max(MANUAL_SHIFT_MIN, value - 1))}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualShift(0)}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      歸零
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualShift((value) => Math.min(MANUAL_SHIFT_MAX, value + 1))}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      +1
                    </button>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatCard label="目前升降調" value={`${formatSigned(totalSemitoneShift)} 半音`} />
                  <StatCard label="播放倍率" value={`${playbackRate.toFixed(3)}x`} />
                  <StatCard label="預估時長" value={formatTime(processedDuration)} />
                </section>

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!canExport}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <DownloadIcon />
                  {isExporting ? "正在匯出 MP3..." : "匯出 MP3"}
                </button>

                <p className="text-center text-xs text-slate-500">
                  目前變調會同步調整速度，若要維持原速度請先選擇接近的目標調性。
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                先上傳一首音樂，接著就能設定原調、升降調並匯出 MP3。
              </div>
            )}

            {statusMessage && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {statusMessage}
              </p>
            )}

            {errorMessage && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function KeySelector({
  title,
  selectedKey,
  onChange,
  activeClassName,
}: {
  title: string;
  selectedKey: string;
  onChange: (next: string) => void;
  activeClassName: string;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className="grid grid-cols-4 gap-2">
        {KEYS.map((keyName) => (
          <button
            key={keyName}
            type="button"
            onClick={() => onChange(keyName)}
            className={`rounded-lg border px-2 py-2 text-sm font-medium transition ${
              selectedKey === keyName
                ? `${activeClassName} shadow-sm`
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {keyName}
          </button>
        ))}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
    </article>
  );
}

async function renderMp3Blob(audio: AudioBuffer): Promise<Blob> {
  const lamejs = await import("lamejs");
  const EncoderCtor = lamejs.Mp3Encoder ?? lamejs.default?.Mp3Encoder;

  if (!EncoderCtor) {
    throw new Error("無法載入 MP3 編碼器");
  }

  const channels = clamp(audio.numberOfChannels, 1, 2);
  const encoder = new EncoderCtor(channels, audio.sampleRate, MP3_BITRATE);
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

function buildExportFileName(originalName: string, semitoneShift: number) {
  const baseName = originalName.replace(/\.[^/.]+$/, "").trim() || "output";
  return `${baseName}_shift_${formatSigned(semitoneShift)}.mp3`;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getClosestSemitoneDistance(baseKey: string, targetKey: string) {
  const baseIndex = KEYS.indexOf(baseKey);
  const targetIndex = KEYS.indexOf(targetKey);

  if (baseIndex === -1 || targetIndex === -1) {
    return 0;
  }

  let diff = targetIndex - baseIndex;
  if (diff > 6) {
    diff -= 12;
  }
  if (diff < -6) {
    diff += 12;
  }
  return diff;
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainSeconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${remainSeconds.toString().padStart(2, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function MusicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
      aria-hidden="true"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m17 8-5-5-5 5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="ml-0.5 h-6 w-6"
      aria-hidden="true"
    >
      <path d="M7.5 5.2a1 1 0 0 1 1.5-.86l9.8 5.8a1 1 0 0 1 0 1.72l-9.8 5.8A1 1 0 0 1 7.5 16.8V5.2Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 15V3" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}

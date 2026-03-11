import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import type { PitchShifterLike } from "~/utils/audio-export";
import { renderProcessedAudioBuffer, renderMp3Blob } from "~/utils/audio-export";
import {
  clamp,
  getClosestSemitoneDistance,
  buildExportFileName,
  triggerDownload,
  TEMPO_MIN_PERCENT,
  TEMPO_MAX_PERCENT,
} from "~/utils/helpers";
import { detectBpm } from "~/utils/detect-bpm";
import type { TranslationKey } from "~/i18n";

type AudioContextCtor = new () => AudioContext;
type TranslateFn = (key: TranslationKey, params?: Record<string, string>) => string;

export function useAudioEngine(t: TranslateFn) {
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
  const [tempoPercent, setTempoPercent] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rawProgressSeconds, setRawProgressSeconds] = useState(0);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const [isDetectingBpm, setIsDetectingBpm] = useState(false);
  const [targetBpm, setTargetBpm] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pitchShifterRef = useRef<PitchShifterLike | null>(null);
  const rawProgressRef = useRef(0);
  const isPlayingRef = useRef(false);

  const keyShift = useMemo(
    () => getClosestSemitoneDistance(baseKey, targetKey),
    [baseKey, targetKey]
  );

  const totalSemitoneShift = useMemo(
    () => keyShift + manualShift,
    [keyShift, manualShift]
  );

  const pitchRatio = useMemo(
    () => Math.pow(2, totalSemitoneShift / 12),
    [totalSemitoneShift]
  );

  const tempoRatio = useMemo(() => tempoPercent / 100, [tempoPercent]);
  const totalMultiplier = useMemo(() => pitchRatio * tempoRatio, [pitchRatio, tempoRatio]);
  const originalDuration = useMemo(() => audioBuffer?.duration ?? 0, [audioBuffer]);

  const processedDuration = useMemo(() => {
    if (!audioBuffer) {
      return 0;
    }
    return audioBuffer.duration / tempoRatio;
  }, [audioBuffer, tempoRatio]);

  const playheadSeconds = useMemo(
    () => rawProgressSeconds / tempoRatio,
    [rawProgressSeconds, tempoRatio]
  );

  const canExport = Boolean(audioBuffer) && !isExporting && !isDecoding;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    rawProgressRef.current = rawProgressSeconds;
  }, [rawProgressSeconds]);

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === "undefined") {
      throw new Error(t("engine.noAudioSupport"));
    }

    if (!audioContextRef.current) {
      const ctor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;

      if (!ctor) {
        throw new Error(t("engine.noWebAudioAPI"));
      }

      audioContextRef.current = new ctor();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, [t]);

  const disposePitchShifter = useCallback(() => {
    const shifter = pitchShifterRef.current;
    if (!shifter) {
      return;
    }

    shifter.disconnect();
    shifter.off("play");
    pitchShifterRef.current = null;
  }, []);

  const ensurePitchShifter = useCallback(async () => {
    if (!audioBuffer) {
      return null;
    }

    if (pitchShifterRef.current) {
      return pitchShifterRef.current;
    }

    const context = await ensureAudioContext();
    const { PitchShifter } = await import("soundtouchjs");

    const shifter = new PitchShifter(context, audioBuffer, 1024, () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      rawProgressRef.current = audioBuffer.duration;
      setRawProgressSeconds(audioBuffer.duration);
    }) as PitchShifterLike;

    shifter.on("play", ({ timePlayed }) => {
      const nextRaw = clamp(timePlayed, 0, audioBuffer.duration);
      if (Math.abs(nextRaw - rawProgressRef.current) < 0.015) {
        return;
      }

      rawProgressRef.current = nextRaw;
      setRawProgressSeconds(nextRaw);
    });

    shifter.pitch = pitchRatio;
    shifter.tempo = tempoRatio;
    shifter.percentagePlayed =
      audioBuffer.duration > 0
        ? clamp(rawProgressRef.current / audioBuffer.duration, 0, 1)
        : 0;

    pitchShifterRef.current = shifter;
    return shifter;
  }, [audioBuffer, ensureAudioContext, pitchRatio, tempoRatio]);

  const stopPlayback = useCallback(
    (resetToStart: boolean) => {
      const shifter = pitchShifterRef.current;
      if (shifter) {
        shifter.disconnect();
      }

      setIsPlaying(false);
      isPlayingRef.current = false;

      if (!resetToStart || !audioBuffer) {
        return;
      }

      rawProgressRef.current = 0;
      setRawProgressSeconds(0);
      if (shifter) {
        shifter.percentagePlayed = 0;
      }
    },
    [audioBuffer]
  );

  const pausePlayback = useCallback(() => {
    const shifter = pitchShifterRef.current;
    if (!shifter) {
      return;
    }

    shifter.disconnect();
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const startPlayback = useCallback(async () => {
    if (!audioBuffer) {
      return;
    }

    const shifter = await ensurePitchShifter();
    if (!shifter) {
      return;
    }

    const context = await ensureAudioContext();

    if (rawProgressRef.current >= audioBuffer.duration - 0.01) {
      rawProgressRef.current = 0;
      setRawProgressSeconds(0);
      shifter.percentagePlayed = 0;
    }

    shifter.connect(context.destination);
    setIsPlaying(true);
    isPlayingRef.current = true;
  }, [audioBuffer, ensureAudioContext, ensurePitchShifter]);

  useEffect(() => {
    const shifter = pitchShifterRef.current;
    if (!audioBuffer || !shifter) {
      return;
    }

    shifter.pitch = pitchRatio;
    shifter.tempo = tempoRatio;

    if (!isPlayingRef.current) {
      shifter.percentagePlayed = clamp(rawProgressRef.current / audioBuffer.duration, 0, 1);
    }
  }, [audioBuffer, pitchRatio, tempoRatio]);

  useEffect(() => {
    if (!audioBuffer) {
      return;
    }

    const clampedRaw = clamp(rawProgressRef.current, 0, audioBuffer.duration);
    if (clampedRaw === rawProgressRef.current) {
      return;
    }

    rawProgressRef.current = clampedRaw;
    setRawProgressSeconds(clampedRaw);
  }, [audioBuffer]);

  useEffect(() => {
    return () => {
      const shifter = pitchShifterRef.current;
      if (shifter) {
        shifter.disconnect();
        shifter.off("play");
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const loadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("audio/")) {
        setErrorMessage(t("engine.invalidFile"));
        setStatusMessage(null);
        return;
      }

      setIsDecoding(true);
      setErrorMessage(null);
      setStatusMessage(null);

      try {
        stopPlayback(true);
        disposePitchShifter();

        const context = await ensureAudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const decoded = await context.decodeAudioData(arrayBuffer.slice(0));

        setAudioBuffer(decoded);
        setFileName(file.name);
        setDetectedBpm(null);
        setTargetBpm(null);
        setStatusMessage(t("engine.loaded", { name: file.name }));

        // BPM 偵測（非阻塞）
        setIsDetectingBpm(true);
        detectBpm(decoded)
          .then((bpm) => setDetectedBpm(bpm))
          .catch(() => setDetectedBpm(null))
          .finally(() => setIsDetectingBpm(false));
      } catch (error) {
        console.error(error);
        setErrorMessage(t("engine.decodeFailed"));
        setAudioBuffer(null);
        setFileName("");
      } finally {
        setIsDecoding(false);
      }
    },
    [disposePitchShifter, ensureAudioContext, stopPlayback, t]
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

    if (!audioBuffer) {
      return;
    }

    const nextRawProgress = clamp(safePlayhead * tempoRatio, 0, audioBuffer.duration);
    rawProgressRef.current = nextRawProgress;
    setRawProgressSeconds(nextRawProgress);

    if (pitchShifterRef.current) {
      pitchShifterRef.current.percentagePlayed =
        audioBuffer.duration > 0 ? nextRawProgress / audioBuffer.duration : 0;
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
      const renderedBuffer = await renderProcessedAudioBuffer(
        audioBuffer,
        totalSemitoneShift,
        tempoRatio
      );
      const mp3Blob = await renderMp3Blob(renderedBuffer);
      const exportName = buildExportFileName(fileName, totalSemitoneShift, tempoPercent);

      triggerDownload(mp3Blob, exportName);
      setStatusMessage(t("engine.exportDone", { name: exportName }));
    } catch (error) {
      console.error(error);
      setErrorMessage(t("engine.exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleTargetBpmChange = useCallback(
    (value: number | null) => {
      setTargetBpm(value);
      if (value !== null && detectedBpm !== null && detectedBpm > 0) {
        const percent = Math.round((value / detectedBpm) * 100);
        setTempoPercent(clamp(percent, TEMPO_MIN_PERCENT, TEMPO_MAX_PERCENT));
      }
    },
    [detectedBpm]
  );

  const handleTempoPercentChange = useCallback(
    (percent: number) => {
      setTempoPercent(percent);
      if (detectedBpm !== null && detectedBpm > 0) {
        setTargetBpm(Math.round((detectedBpm * percent) / 100));
      }
    },
    [detectedBpm]
  );

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

  return {
    fileInputRef,
    fileName,
    isDecoding,
    isDragging,
    setIsDragging,
    openFilePicker,
    handleFileInputChange,
    handleDrop,

    audioBuffer,
    isPlaying,
    playheadSeconds,
    processedDuration,
    handlePlayToggle,
    stopPlayback,
    handleSeek,

    baseKey,
    targetKey,
    manualShift,
    tempoPercent,
    setBaseKey,
    setTargetKey,
    setManualShift,
    setTempoPercent,

    totalSemitoneShift,
    pitchRatio,
    tempoRatio,
    totalMultiplier,
    originalDuration,

    isExporting,
    canExport,
    handleExport,

    detectedBpm,
    isDetectingBpm,
    targetBpm,
    handleTargetBpmChange,
    handleTempoPercentChange,

    errorMessage,
    statusMessage,
  };
}

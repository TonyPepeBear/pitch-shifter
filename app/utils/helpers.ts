export const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const MANUAL_SHIFT_MIN = -12;
export const MANUAL_SHIFT_MAX = 12;
export const TEMPO_MIN_PERCENT = 50;
export const TEMPO_MAX_PERCENT = 150;
export const BPM_MIN = 60;
export const BPM_MAX = 200;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatSigned(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

export function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainSeconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${remainSeconds.toString().padStart(2, "0")}`;
}

export function getClosestSemitoneDistance(baseKey: string, targetKey: string) {
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

export function buildExportFileName(originalName: string, semitoneShift: number, tempoPercent: number) {
  const baseName = originalName.replace(/\.[^/.]+$/, "").trim() || "output";
  const tempoSuffix = tempoPercent === 100 ? "" : `_tempo_${tempoPercent}pct`;
  return `${baseName}_shift_${formatSigned(semitoneShift)}${tempoSuffix}.mp3`;
}

export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

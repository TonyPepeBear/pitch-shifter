import type { TranslationKey } from "./zh-TW";

const en: Record<TranslationKey, string> = {
  // meta
  "meta.title": "Pitch Shifter",
  "meta.description": "Upload music, set original and target keys, preview and export as MP3.",

  // header
  "header.title": "Pitch Shifter",
  "header.subtitle": "Upload your music, set the original and target keys, preview the pitch shift result and export as MP3.",

  // upload
  "upload.placeholder": "Click or drag an audio file here",
  "upload.hint": "Supports MP3, WAV, OGG, M4A",
  "upload.decoding": "Decoding audio...",

  // player
  "player.stop": "Stop",
  "player.pause": "Pause",
  "player.play": "Play",

  // key selector
  "key.base": "Original Key (set manually)",
  "key.target": "Target Key",

  // fine tune
  "fineTune.label": "Fine Tune (semitones)",
  "fineTune.reset": "Reset",

  // tempo
  "tempo.label": "Tempo Adjustment (preserves pitch)",
  "tempo.reset": "Reset to 100%",
  "tempo.hint": "Tempo defaults to 100% to preserve duration. Adjust this slider if you want the track faster or slower.",

  // stats
  "stat.currentShift": "Current Shift",
  "stat.semitone": "semitones",
  "stat.pitchRatio": "Pitch Ratio",
  "stat.tempoRatio": "Tempo Ratio",
  "stat.totalMultiplier": "Total Multiplier",
  "stat.originalDuration": "Original Duration",
  "stat.estimatedDuration": "Estimated Duration",

  // export
  "export.button": "Export MP3",
  "export.exporting": "Exporting MP3...",
  "export.note": "Pitch shift preserves original duration (tempo 100%). Use the tempo slider for fine adjustment. Export applies all settings.",

  // empty state
  "empty.message": "Upload a track first, then set the key, pitch shift, and export as MP3.",

  // how it works
  "howItWorks.title": "How It Works",
  "howItWorks.step1.title": "1) Load & Decode",
  "howItWorks.step1.desc": "Files are decoded locally in the browser — nothing is uploaded to a server.",
  "howItWorks.step2.title": "2) Pitch Calculation",
  "howItWorks.step2.desc": "Calculates the semitone difference between the original and target keys, plus any manual fine-tuning.",
  "howItWorks.step3.title": "3) Pitch & Tempo Separation",
  "howItWorks.step3.desc": "Uses the SoundTouch algorithm to independently adjust pitch and tempo, defaulting to 100% tempo to preserve duration.",
  "howItWorks.step4.title": "4) Export MP3",
  "howItWorks.step4.desc": "Renders the processed audio offline, then encodes it as MP3. The export matches the preview exactly.",
  "howItWorks.formula": "Pitch ratio = 2^(semitones / 12), Tempo ratio = tempo% / 100, Total multiplier = pitch ratio × tempo ratio; Processed duration ≈ original duration / tempo ratio.",

  // audio engine messages
  "engine.noAudioSupport": "Audio is not supported in this environment",
  "engine.noWebAudioAPI": "Browser does not support Web Audio API",
  "engine.invalidFile": "Please select an audio file (e.g. MP3, WAV, OGG)",
  "engine.loaded": "Loaded: {{name}}",
  "engine.decodeFailed": "Failed to decode audio. Please check the file format.",
  "engine.exportFailed": "MP3 export failed. Please try again.",
  "engine.exportDone": "Export complete: {{name}}",

  // error boundary
  "error.title": "Error",
  "error.details": "An unexpected error occurred. Please try again later.",
  "error.notFound": "Page not found.",
  "error.requestFailed": "Request failed",
};

export default en;

import type { Route } from "./+types/home";
import { useAudioEngine } from "~/hooks/use-audio-engine";
import { MusicIcon, UploadIcon, PlayIcon, PauseIcon, StopIcon, DownloadIcon } from "~/components/icons";
import { KeySelector } from "~/components/key-selector";
import { StatCard } from "~/components/stat-card";
import { MANUAL_SHIFT_MIN, MANUAL_SHIFT_MAX, TEMPO_MIN_PERCENT, TEMPO_MAX_PERCENT, formatSigned, formatTime } from "~/utils/helpers";
import { useI18n } from "~/i18n";
import type { Locale } from "~/i18n";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "音訊變調器 | Pitch Shifter" },
    {
      name: "description",
      content: "Upload music, set original and target keys, preview and export as MP3.",
    },
  ];
}

const LOCALE_LABELS: Record<Locale, string> = {
  "zh-TW": "中文",
  en: "EN",
};

export default function Home() {
  const { locale, setLocale, t } = useI18n();

  const {
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
  } = useAudioEngine(t);

  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <section className="mx-auto w-full max-w-4xl">
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_32px_90px_-44px_rgba(49,46,129,0.65)] backdrop-blur">
          <header className="relative px-6 pb-8 pt-10 text-center sm:px-10">
            <div className="absolute right-4 top-4 flex gap-1 sm:right-6">
              {(Object.keys(LOCALE_LABELS) as Locale[]).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocale(loc)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    locale === loc
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <MusicIcon />
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {t("header.title")}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
              {t("header.subtitle")}
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
                {fileName || t("upload.placeholder")}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t("upload.hint")}</p>
              {isDecoding && <p className="mt-3 text-sm font-medium text-indigo-600">{t("upload.decoding")}</p>}
            </div>

            {audioBuffer ? (
              <div className="space-y-6">
                <section className="rounded-2xl border border-indigo-100 bg-indigo-50/55 p-5 sm:p-6">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => stopPlayback(true)}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                      aria-label={t("player.stop")}
                    >
                      <StopIcon />
                    </button>

                    <button
                      type="button"
                      onClick={handlePlayToggle}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition hover:-translate-y-0.5 hover:bg-indigo-700"
                      aria-label={isPlaying ? t("player.pause") : t("player.play")}
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
                    title={t("key.base")}
                    selectedKey={baseKey}
                    onChange={setBaseKey}
                    activeClassName="bg-slate-900 text-white border-slate-900"
                  />

                  <KeySelector
                    title={t("key.target")}
                    selectedKey={targetKey}
                    onChange={setTargetKey}
                    activeClassName="bg-indigo-600 text-white border-indigo-600"
                  />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{t("fineTune.label")}</p>
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
                      {t("fineTune.reset")}
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

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">{t("tempo.label")}</p>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                      {tempoPercent}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={TEMPO_MIN_PERCENT}
                    max={TEMPO_MAX_PERCENT}
                    step={1}
                    value={tempoPercent}
                    onChange={(event) => {
                      handleTempoPercentChange(Number(event.target.value));
                    }}
                    className="pitch-slider mt-4 h-2 w-full"
                  />

                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>{TEMPO_MIN_PERCENT}%</span>
                    <span>100%</span>
                    <span>{TEMPO_MAX_PERCENT}%</span>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleTempoPercentChange(Math.max(TEMPO_MIN_PERCENT, tempoPercent - 1))
                      }
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      -1%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTempoPercentChange(100)}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      {t("tempo.reset")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleTempoPercentChange(Math.min(TEMPO_MAX_PERCENT, tempoPercent + 1))
                      }
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      +1%
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                    {t("tempo.hint")}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <p className="text-sm font-semibold text-slate-700">{t("bpm.label")}</p>

                  <div className="mt-3 flex items-center gap-3">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                      {isDetectingBpm
                        ? t("bpm.detecting")
                        : detectedBpm !== null
                          ? `${detectedBpm} BPM`
                          : t("bpm.unknown")}
                    </span>
                  </div>

                  {detectedBpm !== null && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-slate-600">{t("bpm.targetLabel")}</label>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          step={1}
                          value={targetBpm ?? ""}
                          placeholder="—"
                          onChange={(event) => {
                            const raw = event.target.value;
                            if (raw === "") {
                              handleTargetBpmChange(null);
                              return;
                            }
                            const num = Number(raw);
                            if (!Number.isNaN(num)) {
                              handleTargetBpmChange(Math.round(num));
                            }
                          }}
                          className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                        />
                        {targetBpm !== null && (
                          <button
                            type="button"
                            onClick={() => handleTargetBpmChange(null)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
                          >
                            {t("bpm.clearTarget")}
                          </button>
                        )}
                      </div>

                      {targetBpm !== null && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                          {t("bpm.autoTempoHint", { percent: String(tempoPercent) })}
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label={t("stat.currentShift")} value={`${formatSigned(totalSemitoneShift)} ${t("stat.semitone")}`} />
                  <StatCard label={t("stat.pitchRatio")} value={`${pitchRatio.toFixed(3)}x`} />
                  <StatCard label={t("stat.tempoRatio")} value={`${tempoRatio.toFixed(3)}x`} />
                  <StatCard label={t("stat.totalMultiplier")} value={`${totalMultiplier.toFixed(3)}x`} />
                </section>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard label={t("stat.originalDuration")} value={formatTime(originalDuration)} />
                  <StatCard label={t("stat.estimatedDuration")} value={formatTime(processedDuration)} />
                  <StatCard
                    label={t("stat.detectedBpm")}
                    value={
                      isDetectingBpm
                        ? "..."
                        : detectedBpm !== null
                          ? `${detectedBpm}`
                          : "—"
                    }
                  />
                </section>

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!canExport}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <DownloadIcon />
                  {isExporting ? t("export.exporting") : t("export.button")}
                </button>

                <p className="text-center text-xs text-slate-500">
                  {t("export.note")}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                {t("empty.message")}
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

            <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold text-slate-900">{t("howItWorks.title")}</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">{t("howItWorks.step1.title")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {t("howItWorks.step1.desc")}
                  </p>
                </article>

                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">{t("howItWorks.step2.title")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {t("howItWorks.step2.desc")}
                  </p>
                </article>

                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">{t("howItWorks.step3.title")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {t("howItWorks.step3.desc")}
                  </p>
                </article>

                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">{t("howItWorks.step4.title")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {t("howItWorks.step4.desc")}
                  </p>
                </article>
              </div>

              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-700">
                {t("howItWorks.formula")}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

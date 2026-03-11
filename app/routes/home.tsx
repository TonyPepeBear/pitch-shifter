import type { Route } from "./+types/home";
import { useAudioEngine } from "~/hooks/use-audio-engine";
import { MusicIcon, UploadIcon, PlayIcon, PauseIcon, StopIcon, DownloadIcon } from "~/components/icons";
import { KeySelector } from "~/components/key-selector";
import { StatCard } from "~/components/stat-card";
import { MANUAL_SHIFT_MIN, MANUAL_SHIFT_MAX, TEMPO_MIN_PERCENT, TEMPO_MAX_PERCENT, formatSigned, formatTime } from "~/utils/helpers";

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

    errorMessage,
    statusMessage,
  } = useAudioEngine();

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
                    title=" 原調 (需自行設置)"
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

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">速度微調（維持調性）</p>
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
                      setTempoPercent(Number(event.target.value));
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
                        setTempoPercent((value) => Math.max(TEMPO_MIN_PERCENT, value - 1))
                      }
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      -1%
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempoPercent(100)}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      回到 100%
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTempoPercent((value) => Math.min(TEMPO_MAX_PERCENT, value + 1))
                      }
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      +1%
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                    已預設優先維持時長，速度微調預設為 100%。若你希望歌曲更快或更慢，再調整此滑桿。
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard label="目前升降調" value={`${formatSigned(totalSemitoneShift)} 半音`} />
                  <StatCard label="音高倍率" value={`${pitchRatio.toFixed(3)}x`} />
                  <StatCard label="速度倍率" value={`${tempoRatio.toFixed(3)}x`} />
                  <StatCard label="最終總倍數" value={`${totalMultiplier.toFixed(3)}x`} />
                </section>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <StatCard label="原始時長" value={formatTime(originalDuration)} />
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
                  變調預設維持原始時長（速度 100%），可再用速度微調做細節修正；匯出會完整套用所有設定。
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

            <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold text-slate-900">本網頁運作原理</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">1) 載入與解析</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    檔案會在瀏覽器本機解析，不需上傳遠端伺服器。
                  </p>
                </article>

                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">2) 轉調計算</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    先由原調與目標調性計算半音差，再加上手動微調半音，得到最終轉調值。
                  </p>
                </article>

                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">3) 音高與速度分離</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    使用 SoundTouch 演算法，讓音高（Pitch）與速度（Tempo）可獨立調整，預設速度 100% 以維持時長。
                  </p>
                </article>

                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">4) 匯出 MP3</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    會先離線渲染成轉換後音訊，再用 MP3 編碼器輸出檔案，匯出結果與預聽一致。
                  </p>
                </article>
              </div>

              <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-700">
                音高倍率 = 2^(半音 / 12)，速度倍率 = 速度% / 100，最終總倍數 = 音高倍率 × 速度倍率；
                轉換後時長約為原始時長 / 速度倍率。
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

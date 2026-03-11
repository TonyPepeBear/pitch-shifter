const zhTW = {
  // meta
  "meta.title": "音訊變調器 | Pitch Shifter",
  "meta.description": "上傳音樂、設定原調與目標調性，預覽後匯出 MP3。",

  // header
  "header.title": "音訊變調器",
  "header.subtitle": "上傳您的音樂，設定原調與目標調性，立即預覽升降調結果並匯出 MP3。",

  // upload
  "upload.placeholder": "點擊或拖曳音訊檔到這裡",
  "upload.hint": "支援 MP3、WAV、OGG、M4A",
  "upload.decoding": "正在解析音訊...",

  // player
  "player.stop": "停止播放",
  "player.pause": "暫停播放",
  "player.play": "播放",

  // key selector
  "key.base": "原調 (需自行設置)",
  "key.target": "目標調性",

  // fine tune
  "fineTune.label": "微調（半音）",
  "fineTune.reset": "歸零",

  // tempo
  "tempo.label": "速度微調（維持調性）",
  "tempo.reset": "回到 100%",
  "tempo.hint": "已預設優先維持時長，速度微調預設為 100%。若你希望歌曲更快或更慢，再調整此滑桿。",

  // stats
  "stat.currentShift": "目前升降調",
  "stat.semitone": "半音",
  "stat.pitchRatio": "音高倍率",
  "stat.tempoRatio": "速度倍率",
  "stat.totalMultiplier": "最終總倍數",
  "stat.originalDuration": "原始時長",
  "stat.estimatedDuration": "預估時長",

  // export
  "export.button": "匯出 MP3",
  "export.exporting": "正在匯出 MP3...",
  "export.note": "變調預設維持原始時長（速度 100%），可再用速度微調做細節修正；匯出會完整套用所有設定。",

  // empty state
  "empty.message": "先上傳一首音樂，接著就能設定原調、升降調並匯出 MP3。",

  // how it works
  "howItWorks.title": "本網頁運作原理",
  "howItWorks.step1.title": "1) 載入與解析",
  "howItWorks.step1.desc": "檔案會在瀏覽器本機解析，不需上傳遠端伺服器。",
  "howItWorks.step2.title": "2) 轉調計算",
  "howItWorks.step2.desc": "先由原調與目標調性計算半音差，再加上手動微調半音，得到最終轉調值。",
  "howItWorks.step3.title": "3) 音高與速度分離",
  "howItWorks.step3.desc": "使用 SoundTouch 演算法，讓音高（Pitch）與速度（Tempo）可獨立調整，預設速度 100% 以維持時長。",
  "howItWorks.step4.title": "4) 匯出 MP3",
  "howItWorks.step4.desc": "會先離線渲染成轉換後音訊，再用 MP3 編碼器輸出檔案，匯出結果與預聽一致。",
  "howItWorks.formula": "音高倍率 = 2^(半音 / 12)，速度倍率 = 速度% / 100，最終總倍數 = 音高倍率 × 速度倍率；轉換後時長約為原始時長 / 速度倍率。",

  // audio engine messages
  "engine.noAudioSupport": "目前環境不支援音訊功能",
  "engine.noWebAudioAPI": "瀏覽器不支援 Web Audio API",
  "engine.invalidFile": "請選擇音訊檔案（例如 MP3、WAV、OGG）",
  "engine.loaded": "已載入：{{name}}",
  "engine.decodeFailed": "音訊解析失敗，請確認檔案格式是否正確",
  "engine.exportFailed": "MP3 匯出失敗，請稍後再試",
  "engine.exportDone": "匯出完成：{{name}}",

  // error boundary
  "error.title": "發生錯誤",
  "error.details": "系統發生未預期錯誤，請稍後再試。",
  "error.notFound": "找不到指定頁面。",
  "error.requestFailed": "請求失敗",
} as const;

export type TranslationKey = keyof typeof zhTW;
export default zhTW;

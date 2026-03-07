# 音訊變調器 | Pitch Shifter

一個強大且完全在瀏覽器端執行的音訊升降調工具。這款應用程式允許使用者上傳音樂、設定原調與目標調性，並能即時預覽升降調結果，最後一鍵匯出高品質的 MP3 檔案。

## ✨ 核心特色 (Features)

- 🔒 **本機處理 (Local Processing)**：所有音訊解析與運算皆在您的瀏覽器中完成，無需上傳檔案至遠端伺服器，保障您的隱私與資料安全。
- 🎵 **精準升降調 (Pitch Shifting)**：只需輸入「原調」與「目標調性」，系統將自動計算最佳半音差，亦支援自訂微調（半音）。
- ⏱️ **獨立速度控制 (Tempo Control)**：利用獨立演算法將音高與速度分離。升降調的同時預設維持原曲時長，或依照需求自由調整速度。
- 🎧 **即時預覽 (Real-time Preview)**：透過 Web Audio API 結合 SoundTouchJS，轉換結果可即時聆聽，無須等待漫長渲染。
- 💾 **MP3 匯出 (MP3 Export)**：處理完成的音軌透過離線渲染，可直接轉碼並下載為 MP3 格式，隨取隨用。

## 🛠️ 技術棧 (Tech Stack)

- **前端框架**：[React Router 7](https://reactrouter.com/) + React 19
- **樣式設計**：[Tailwind CSS v4](https://tailwindcss.com/)
- **音訊處理**：[SoundTouchJS](https://github.com/jakubfiala/soundtouchjs) (音高與速度演算法) + 原生 Web Audio API (`AudioContext`, `OfflineAudioContext`)
- **音訊編碼**：[@breezystack/lamejs](https://github.com/breezystack/lamejs) (客戶端轉碼 MP3)
- **部署環境**：[Cloudflare Workers](https://workers.cloudflare.com/) 邊緣運算平台

## 🚀 快速開始 (Getting Started)

### 1. 安裝依賴 (Installation)

請確保您的環境中已安裝 Node.js (建議版本 22+，依據 `package.json` 引擎設定)，然後執行：

```bash
yarn install
# 或是 npm install
```

### 2. 啟動開發伺服器 (Development)

啟動具有 HMR (熱模組替換) 功能的開發環境：

```bash
yarn dev
# 或是 npm run dev
```

應用程式預設將會在 `http://localhost:5173` 運行。

### 3. 編譯與部署 (Build & Deploy)

建立正式機產物並透過 Wrangler 部署至 Cloudflare Workers：

```bash
yarn deploy
# 或是 npm run deploy
```

若您只是想在本地預覽編譯後的正式機版本：

```bash
yarn preview
# 或是 npm run preview
```

## 🧠 運作原理 (How It Works)

1. **載入與解析**：透過 `AudioContext.decodeAudioData` 在使用者設備端解析上傳的音訊檔 (支援 MP3, WAV, OGG, M4A 等)。
2. **轉調計算**：由使用者設定的「原調」與「目標調」算出半音差（距離），再加上使用者手動輸入的微調值，得出最終音高倍率 ($2^{\text{半音差} / 12}$)。
3. **音高與速度分離**：核心依賴 `SoundTouchJS` 演算法，將 Pitch (音高) 與 Tempo (速度) 分離。預設速度設定為 100%，以確保改變調性的同時不會改變原曲時長。
4. **離線渲染與匯出**：匯出時透過 `OfflineAudioContext` 在背景高速渲染出轉換後的音軌 (`AudioBuffer`)，再交由 `lamejs` 批次轉碼成二進位的 MP3 檔案 (`Blob`) 供使用者下載。

## 📝 授權條款 (License)

本專案自訂程式碼依現有狀態提供。內部採用的開源套件 (如 `soundtouchjs`, `lamejs`, `react` 等) 皆受其各自的授權條款約束。

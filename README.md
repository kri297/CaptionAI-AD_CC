# 🎬 CaptionAI — AI-Powered Caption Studio

Upload any video → Gemini AI transcribes speech **(CC)** and detects audio events **(AC)** → Edit everything → Download SRT or VTT files.

## Quick Start

### 1. Install dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Set up your Gemini API key

```bash
# Copy the example env file
copy .env.example .env
```

Then open `.env` and replace `your_gemini_api_key_here` with your actual key.
Get one free at: https://aistudio.google.com/app/apikey

### 3. Run the app

```bash
npm run dev
```

This starts:
- **Server** at `http://localhost:3001`
- **Client** at `http://localhost:5173`

Open your browser at **http://localhost:5173**

---

## Features

| Feature | Description |
|---------|-------------|
| **CC (Closed Captions)** | Word-for-word transcription of all spoken dialogue with timestamps |
| **AC (Audio Captions)** | Non-speech audio events like `[soft piano melody]` or `[crowd cheering]` |
| **Inline Editing** | Edit text, timestamps, add/delete captions directly in the UI |
| **Video Player** | Custom controls, seek bar, volume, speed, fullscreen, keyboard shortcuts |
| **Timeline** | Visual CC + AC tracks with playhead, click to seek |
| **SRT Export** | Standard SubRip format — works with VLC, YouTube, Premiere, etc. |
| **VTT Export** | WebVTT format for HTML5 video and web players |
| **JSON Export** | Raw caption data for developers |
| **Separate tracks** | Download CC-only or AC-only files |

## Supported Formats

MP4 · WebM · MOV · AVI · MKV · OGG — up to **2 GB**

## Keyboard Shortcuts (in Editor)

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` | Back 5 seconds |
| `→` | Forward 5 seconds |

## Export Options

From the export bar at the bottom of the editor:

- **All SRT** — Combined CC + AC in one SRT file
- **All VTT** — Combined CC + AC in one WebVTT file  
- **CC SRT / CC VTT** — Closed captions (speech) only
- **AC SRT / AC VTT** — Audio captions (sounds) only
- **JSON** — Full raw data export
- **Copy as SRT** — Copies everything to clipboard

---

## Project Structure

```
ACandCC/
├── server/
│   ├── index.js          # Express server
│   └── routes/
│       └── process.js    # Gemini upload + analysis
└── client/
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── Upload/DropZone.jsx
        │   ├── Analyse/AnalysisProgress.jsx
        │   ├── Player/VideoPlayer.jsx
        │   ├── Timeline/Timeline.jsx
        │   ├── Editor/EditorPanel.jsx + CaptionCard.jsx
        │   └── Export/ExportPanel.jsx
        ├── context/CaptionContext.jsx
        ├── hooks/useVideoSync.js
        └── utils/timeUtils.js, srtParser.js, vttExporter.js
```

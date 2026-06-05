# Stealth AI

Production-grade Windows desktop app for real-time AI assistance during interviews. The stealth overlay is excluded from screen capture (Zoom, Teams, Meet, OBS, Windows screenshot) via `WDA_EXCLUDEFROMCAPTURE` and Electron content protection.

## Features

- **Dashboard** — Parakeet-style dark UI: home onboarding, sessions, resumes, documents, encrypted API keys
- **Stealth overlay** — Floating transparent window with live transcript, streaming AI answers, global hotkeys
- **Audio** — Microphone + WASAPI loopback, VAD, Groq/OpenAI Whisper transcription
- **AI** — Streaming from Gemini, Groq, OpenAI, or Claude (only configured providers appear in the model list)
- **Privacy** — API keys encrypted with machine-derived key; no cloud account required

## Platform support

| Feature | Windows 10/11 | Linux / macOS |
|--------|---------------|---------------|
| Dashboard (setup, API keys, resumes, sessions) | Yes | **Yes** |
| Stealth overlay (capture-invisible) | Yes | No |
| System audio loopback (Zoom/Teams voice) | Yes | No |
| Global hotkeys | Yes | Limited / none |

Use **Linux or macOS** to configure the app; use **Windows** during the actual interview for the live overlay.

## Requirements

- **Windows 10/11 x64** for full stealth overlay and audio
- **Linux or macOS** for dashboard-only development and setup
- Node.js 18+
- API keys for at least one provider (Gemini, Groq, OpenAI, or Anthropic)
- Microphone (Windows); loopback capture requires WASAPI on Windows

## Setup

```bash
git clone <repo> && cd stealth-ai
npm install          # postinstall auto-builds native addon on Windows
npm start            # dev mode - opens dashboard
npm run build        # produces Windows .exe installer
```

On Windows, install optional native audio modules (included by default):

```bash
npm install
npm run build:native
```

Linux/macOS dev: UI and logic run without `naudiodon` / `node-record-lpcm16`; full capture requires Windows.

## Global hotkeys

| Hotkey | Action |
|--------|--------|
| Ctrl+Shift+H | Toggle overlay |
| Ctrl+Shift+A | Generate answer |
| Ctrl+Shift+C | Copy answer |
| Ctrl+Shift+R | Regenerate |
| Ctrl+Shift+M | Toggle mic |
| Ctrl+Shift+[ / ] | Opacity down/up |
| Ctrl+Shift+S | Show dashboard |
| Ctrl+Shift+X | Quit |

## Data storage

Local files under `%APPDATA%\stealth-ai\`:

- `config.json` — encrypted settings and API keys
- `sessions/` — session JSON with transcripts and Q&A
- `resumes/` — parsed resume text
- `documents/` — extra context

## Native addon

`native/windows-stealth/` builds `windows-stealth.node` on Windows using `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`. On non-Windows platforms, `npm run build:native` skips the build; overlay still uses `setContentProtection(true)`.

## License

MIT

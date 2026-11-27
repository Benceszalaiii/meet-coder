# MeetCoder for Windows

The Windows version of MeetCoder — same interface (Hungarian), same behaviour, same single-model setup
(Sonnet 5.5 at medium effort through the locally installed Claude Code). The macOS original lives in `../Sources/MeetCoder`.

## Requirements

- Windows 10 (1903+) or 11
- [Claude Code](https://claude.com/claude-code) installed and signed in (`claude` must work in a terminal)
- [Git for Windows](https://git-scm.com/download/win) — used for the private change history (per-change undo)
- Whatever your class projects need: Node.js/npm, PHP + Composer (Laravel)

## Run / build

```bash
cd windows
npm install
npm start          # run from source
npm run dist       # installer + portable exe in windows/release
```

CI builds the installer on every push to `main` (see `.github/workflows/windows.yml`, artifact `MeetCoder-windows`).

## How the macOS pieces map to Windows

| macOS | Windows |
| --- | --- |
| SwiftUI | Electron + Preact, the same layout, colours, spacing and animations |
| ScreenCaptureKit | Electron window capture (`getDisplayMedia`), 3 fps, window picked like before (Meet / Screentask / Chrome first) |
| Vision OCR | Tesseract (English + Hungarian), fully offline, bundled |
| Menu-bar extra | System-tray icon with the same menu (closing the window keeps watching in the tray) |
| `zsh`, `perl setpgrp`, `kill(-pgid)` | `cmd.exe`, `taskkill /T` |
| `rsync --ignore-existing` | built-in copy with the same excludes; never overwrites existing files |
| SF Symbols | Lucide icons |
| `/Volumes/Diák közös informatika` | `T:\` (configurable in Settings) |
| Application Support | `%APPDATA%\MeetCoder` |

Small deliberate differences: the traffic-light gap in the top bar becomes room for the Windows caption buttons
(so the compact window is 540 px wide instead of 420), the window list shows window titles only (Windows does not expose
the owning app name), and "Megnyitás a Finderben" reads "Megnyitás a Fájlkezelőben".

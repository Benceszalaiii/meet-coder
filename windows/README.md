# MeetCoder for Windows

MeetCoder for Windows uses Electron and a Hungarian interface. The native macOS version lives in `../Sources/MeetCoder`. Both apps offer the same model choices.

## Requirements

- Windows 10 (1903+) or 11
- At least one model CLI available on your PATH
- [Git for Windows](https://git-scm.com/download/win) — used for the private change history (per-change undo)
- Whatever your class projects need: Node.js/npm, PHP + Composer (Laravel)

## Model selection on Windows and macOS

Open **Beállítások → Modell** to choose a model. **Automatikus** tries Claude Sonnet first, then the default model reported by Codex, then OpenCode. A saved choice that becomes unavailable falls back to OpenCode. Refresh the list after installing a CLI, changing accounts or restoring access.

| Provider | Setup |
| --- | --- |
| Claude | Install Claude Code and use `claude auth login` with your Claude subscription. The picker offers Sonnet, Opus and Haiku. |
| Codex | Install the Codex CLI and use `codex login` with your ChatGPT subscription. The picker lists models from the signed-in CLI. |
| OpenCode | Install the OpenCode CLI and configure its default model. Confirm that `opencode run` works in a terminal. MeetCoder uses that model and its provider's billing settings. |

Codex can inspect and edit project files with shell execution disabled. Claude and image-capable Codex models can use screenshots. OpenCode receives the recognized screen text so its configured default can be a text-only model.

The cost display uses amounts reported by the CLI. Codex subscription usage counts toward your plan limits and does not supply a dollar amount. A coding run that loses access may have already edited files, so MeetCoder uses the fallback for subsequent work.

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

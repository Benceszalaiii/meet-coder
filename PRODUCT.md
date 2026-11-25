# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

(Native Apple-platform app: macOS, SwiftUI, built with Swift Package Manager. The schema has no macOS value; `ios` is the closest and means "native Apple design language", not iPhone.)

## Users

One user: a student following programming classes held over Google Meet (or a Screentask client) in a Chrome window. The teacher shares their screen with no audio. The student does not watch the call; it stays open in the background while they do their own work, and they glance at MeetCoder on a second screen, at full size.

## Product Purpose

MeetCoder watches the teacher's shared screen, keeps class notes, and keeps the student's local project in sync with what the teacher is building, without the student paying attention. Success is: after class the notes exist under the right project and date, the project contains what the teacher wrote, and it runs.

## Positioning

It works from what is on the screen alone. Nothing is recorded from audio, and all model work is one model at one setting: Sonnet 5.5 at medium effort, through the locally installed Claude Code.

## Operating Context

- The Meet window is a separate Chrome window that may be covered but not minimised.
- The teacher is whoever is sharing the screen; their name is read from the meeting UI.
- Project files come from the school share known as "T:" (mounted at `/Volumes/Diák közös informatika`), laid out as teacher folder, then group folder, then project. Teacher folders may be nicknames.
- Projects are copied into a configurable root (default `~/school/projects`). Until the project is recognised, notes go to `<root>/<date>.md`; afterwards into the project's `notes` folder.
- Projects are mostly Next.js, Express and Laravel. A dev server runs for the active project so its output is visible.

## Capabilities and Constraints

- Change-detected capture of one window with on-device text recognition; only changed frames reach the model.
- Live preview of the stream, the part of the app being coded now, running notes, a change log with AI-written headers and per-change undo, dev server output and page preview, session cost with a cap.
- A button that fetches project files from T: for the configured group names; existing local files are never overwritten.
- No git branching; edits go straight into the project folder.
- If C# is present, code is written only: nothing is run, built or restored.
- Autonomous by default (coding and fetching), with a manual instruction box.
- The interface, the notes and the change headers are Hungarian.

## Brand Commitments

The interface uses Nievau, the design system of the user's `design-portfolio` project (`~/repos/next/design-portfolio/DESIGN.md`): Royal Blue and Acid Lime fields under tinted glass, TeX Gyre Heros at regular and bold. The user made this binding.

## Evidence on Hand

The working app in `Sources/MeetCoder`. No real class session has been captured yet, so there are no real notes, change entries or screenshots to show; do not fabricate them outside of clearly labelled previews.

## Product Principles

1. Readable at a glance from across the desk: what is being coded now comes first.
2. Unattended means trustworthy: every autonomous action is visible, attributable and reversible.
3. Cheap by construction: local work first, the model only for what changed.
4. Organised without asking: projects, notes and teachers sort themselves.

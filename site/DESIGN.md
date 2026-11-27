---
name: MeetCoder
description: The website for MeetCoder. A class shared over Google Meet becomes notes and code in your own project.
colors:
  royal-night: "oklch(0.16 0.069 275.2)"
  royal-deep: "oklch(0.212 0.099 273.9)"
  royal: "oklch(0.288 0.144 272.8)"
  royal-lift: "oklch(0.409 0.197 271.4)"
  royal-glow: "oklch(0.563 0.24 271.5)"
  royal-ink: "oklch(0.897 0.031 281.8)"
  royal-ink-soft: "oklch(0.795 0.065 280.9)"
  nitro: "oklch(0.9 0.21 124)"
  nitro-lift: "oklch(0.94 0.19 118)"
  nitro-ink: "oklch(0.24 0.055 132)"
  nitro-ink-soft: "oklch(0.36 0.075 130)"
typography:
  display:
    fontFamily: "Allo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 10.2vw, 9.6rem)"
    fontWeight: 640
    lineHeight: 0.92
    letterSpacing: "-0.04em"
    fontVariation: "\"wght\" 640, \"ROND\" 10, \"opsz\" 32"
  drift:
    fontFamily: "Allo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(8rem, 22vw, 22rem)"
    fontWeight: 900
    lineHeight: 0.8
    letterSpacing: "-0.04em"
    fontVariation: "\"wght\" 900, \"ROND\" 100, \"opsz\" 32"
  headline:
    fontFamily: "Allo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 1.3rem + 3.4vw, 4rem)"
    fontWeight: 850
    lineHeight: 0.98
    letterSpacing: "-0.035em"
    fontVariation: "\"ROND\" 0"
  headline-sm:
    fontFamily: "Allo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 1.4rem + 1.6vw, 2.75rem)"
    fontWeight: 850
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Allo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 850
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  subtitle:
    fontFamily: "Allo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  lede:
    fontFamily: "Allo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.1rem, 1rem + 0.4vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Allo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "\"calt\", \"ss03\""
    fontVariation: "\"ROND\" 10"
  label:
    fontFamily: "Allo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 700
    fontVariation: "\"ROND\" 30"
  mono:
    fontFamily: "ui-monospace, SF Mono, Cascadia Code, Menlo, Consolas, monospace"
    fontSize: "0.82rem"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  sticker: "0.24em"
  tile: "1rem"
  well: "1rem"
  tree: "1.75rem"
  glass: "2.5rem"
  sheet: "3.5rem"
  pill: "9999px"
spacing:
  gutter: "clamp(1.25rem, 3vw, 2.5rem)"
  section: "clamp(5rem, 12vh, 9rem)"
  panel: "clamp(1.75rem, 3vw, 3rem)"
  grid-gap: "1.5rem"
  container: "78rem"
components:
  pill:
    textColor: "{colors.royal-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 0.375rem 0 1.5rem"
    height: "3.5rem"
  pill-compact:
    textColor: "{colors.royal-ink}"
    rounded: "{rounded.pill}"
    padding: "0 0.25rem 0 1.1rem"
    height: "2.75rem"
  pill-chip:
    backgroundColor: "{colors.nitro}"
    textColor: "{colors.nitro-ink}"
    rounded: "{rounded.pill}"
    size: "2.75rem"
  glass-panel:
    textColor: "{colors.royal-ink}"
    rounded: "{rounded.glass}"
    padding: "{spacing.panel}"
  solid-panel:
    backgroundColor: "{colors.royal}"
    textColor: "{colors.royal-ink}"
    rounded: "{rounded.glass}"
    padding: "{spacing.panel}"
  nav:
    textColor: "{colors.royal-ink}"
    rounded: "{rounded.pill}"
    padding: "0 0.625rem 0 1.25rem"
    height: "4rem"
  sticker-lime:
    backgroundColor: "{colors.nitro}"
    textColor: "{colors.nitro-ink}"
    rounded: "{rounded.sticker}"
    size: "0.82em"
  sticker-ink:
    backgroundColor: "{colors.royal-ink}"
    textColor: "{colors.royal}"
    rounded: "{rounded.sticker}"
    size: "0.82em"
  yours-chip:
    backgroundColor: "{colors.nitro}"
    textColor: "{colors.nitro-ink}"
    rounded: "{rounded.pill}"
    padding: "0.35rem 0.8rem"
  step-disc:
    backgroundColor: "{colors.royal-ink}"
    textColor: "{colors.royal}"
    rounded: "{rounded.pill}"
    size: "2.75rem"
  code-well:
    backgroundColor: "{colors.royal-night}"
    textColor: "{colors.royal-ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.well}"
    padding: "1rem 1.15rem"
  icon-button:
    textColor: "{colors.royal-ink}"
    rounded: "{rounded.pill}"
    size: "44px"
---

# Design System: MeetCoder

## Overview

**Creative North Star: "The Class Behind Glass"**

The site is a night-time Royal room where the words of a programming class (KÓD, JEGYZET, PROJEKT, VÁLTOZÁS) drift past at poster scale, and you read about MeetCoder through tinted glass laid over them. One kinetic Allo headline opens each page: letters land on a spring, swell in weight and roundness under the pointer, and carry small stickers set into the line like part of the word. Below it the page moves in fields that rise like the next swatch in a sample book: Royal glass, one Acid Lime field, a deep Royal field, then the night footer sheet.

Density is calm and editorial: few panels, generous gutters, spec rows instead of feature cards. Acid Lime is the counter hue and it means *you*: your download, your project, your platform, your focus. Roundness is meaning as well: Allo's ROND axis stays sharp while something is in progress and goes fully round when it resolves or when you touch it.

This file covers the website (`site/`) only. The native macOS and Windows app has its own system and is out of scope here.

**Key Characteristics:**
- Royal Night ground, Royal tinted glass, Acid Lime as the counter hue.
- One kinetic display line per page, with lime and ink stickers inline.
- Giant drifting class words behind the glass, never in front of it.
- ROND as meaning: sharp at work, round when resolved or touched.
- One overshoot spring for everything that lands or responds.
- Spec rows and hairlines instead of cards; pills for every action.

### Motion

- **Spring** (`linear()` with one overshoot to about 1.11 and a single settle): everything that lands, lifts, rounds or answers a press, usually 500 to 900ms. The overshoot is intentional.
- **Out** (`cubic-bezier(0.16, 1, 0.3, 1)`): color, underline and fade transitions, 200 to 400ms, plus the hero foot's 900ms rise.
- Scroll-driven entries (`animation-timeline: view()`) scale and translate glass panels and sheets in place, transform only.
- Reduced motion collapses every animation and transition to 1ms. Reduced transparency removes `backdrop-filter` from glass, nav and pills and fills them with the solid tint.

## Colors

Two families, each a full field with its own ink: Royal for the world, Acid Lime (Nitro) for the counter hue. No neutrals outside them.

### Primary
- **Royal** (`royal`): base tint of glass and solid panels, the nav pill, icon tiles in the lime field and the tree card.
- **Royal Lift** (`royal-lift`): the light end of the glass gradient, the active code line on the teacher's screen, the main drift letters.
- **Royal Glow** (`royal-glow`): every other drift letter, at 70% so the drift shimmers in two tones.

### Secondary
- **Acid Lime** (`nitro`): the counter hue. As an accent on Royal it appears only on the elements in the Lime Is You Rule. As a field it fills the single "Megbízhatóság" section, where it becomes the ground and Royal becomes its counter.
- **Lime Lift** (`nitro-lift`): the lime hue's `--tint-lift`, the light end of any glass tinted inside the lime field.

### Neutral
- **Royal Night** (`royal-night`): page ground, footer sheet, and the sunken code wells (teacher screen, commands, build shells).
- **Royal Deep** (`royal-deep`): ground of the deep Royal fields (models, build from source).
- **Royal Ink** (`royal-ink`): text on Royal, the ink sticker, numbered discs, platform icon tiles.
- **Royal Ink Soft** (`royal-ink-soft`): ledes, secondary text, spec values, nav links at rest.
- **Lime Ink** (`nitro-ink`) / **Lime Ink Soft** (`nitro-ink-soft`): text on lime: chips, stickers, the lime field's copy.
- **Hairlines**: never a separate token. Always the current ink mixed into transparent: 16% for spec rows and pane dividers, 12% for log rows, 22% for principle rows in the lime field.

### Named Rules
**The Lime Is You Rule.** On Royal ground, Acid Lime marks the visitor and their own things only: the headline sticker, the arrow chip inside every pill, focus and selection, the "A te projekted" pane and its new files and lines, and the "Ezt használod" OS chip. If an element is about the teacher, the class or the product, it is not lime.

**The Hue Swap Rule.** Each field sets `--tint`, `--ink`, `--ring` and `--counter-ink` together (`hue-royal`, `hue-nitro`). Inside the lime field the ring and counter flip to Royal. Never set one of those without the others.

**The Hairline From Ink Rule.** Borders and dividers are the local ink at low opacity, so they follow the field they sit in.

## Typography

**Display Font:** Allo variable (wght 100 to 900, ROND, opsz), self-hosted, with ui-sans-serif and system-ui fallback.
**Body Font:** Allo, the same face.
**Label/Mono Font:** the system monospace stack (ui-monospace, SF Mono, Cascadia Code, Menlo, Consolas) for code, paths and commands only.

**Character:** One face does everything. Weight and the ROND axis carry the hierarchy and the meaning, so the page reads as one voice that can be sharp and working or round and done.

### Hierarchy
- **Display** (640 base, live axis 620 to 900; `clamp(3rem, 10.2vw, 9.6rem)`; 0.92): the kinetic headline only, one per page. Lines are staggered (start, indent 1.4em, end). 15.5vw on phones, all lines flush left.
- **Drift** (900, ROND 100; `clamp(8rem, 22vw, 22rem)`; 0.8): the class words behind glass. Decorative and `aria-hidden`.
- **Headline** (850; `clamp(2.2rem, 1.3rem + 3.4vw, 4rem)`; 0.98; -0.035em): section headlines; ROND 0 by default. The footer close sets it larger, up to 5.5rem at 14ch.
- **Headline Small** (850; up to 2.75rem): platform names on the download page.
- **Title** (850; 1.6rem; 1.1): panel and row titles (Röviden, model names, build targets).
- **Subtitle** (750; 1.2rem; 1.25): principle and setup step titles, with an optional 1.1rem leading icon.
- **Lede** (400; `clamp(1.1rem, 1rem + 0.4vw, 1.3rem)`; 1.45; max 44ch, the large variant 36ch): the soft-ink paragraph under a headline.
- **Body** (400; 1.0625rem; 1.55; `calt`, `ss03`, ROND 10): everything else. `strong` is 650 in full ink.
- **Label** (600 to 700; 0.95rem; ROND 30 on pills): nav links, pills, undo buttons, the platform line.
- **Mono** (0.82rem; 1.7): commands, the folder tree, build shells. The demo's miniature screen uses 0.76rem for code and 0.74rem for tabs and paths.

### Named Rules
**The ROND Means Done Rule.** Sharp (ROND 0 to 10) while something is working, fully round (ROND 100) when it resolves or answers a touch. The live-class headline rounds when the class finishes, pills and the undo button round on hover, and display letters round under the pointer.

**The One Kinetic Line Rule.** Each page gets one kinetic display headline, split into per-letter spans for the axis effect, and it always keeps a screen-reader label with the plain sentence.

## Layout

Content sits in a centered container (max 78rem) with a fluid gutter (`clamp(1.25rem, 3vw, 2.5rem)`); the nav pill caps at 75rem. Sections are separated by a fluid section step (`clamp(5rem, 12vh, 9rem)`). The hero fills the first viewport (min `max(100svh, 40rem)`): the kinetic line is vertically centered and the foot row puts the download pill on the left and the lede on the right. The download page uses a short hero (`max(66svh, 32rem)`).

Glass panels sit in two-up grids (1.3fr / 1fr for the pitch and spec, equal columns for platforms) with a 1.5rem gap. Fields use a 12-column grid: a sticky head (span 5, sticky at 8rem) beside the content (columns 6 to the end), with 3rem by 3.5rem gaps.

Breakpoints: at 980px and below the nav links hide, every two-up grid collapses to one column, and the field head stops being sticky. At 560px and below the spec rows stack, log and command rows wrap, the drift is removed, and the world's glass panels render solid.

**The No Drift On Phones Rule.** At 560px and below nothing drifts, and the world panels render as solid Royal gradients with no `backdrop-filter`. Too little shows through glass at that width to justify it.

## Elevation & Depth

Depth comes from layering, not stacking: the drift sits at z −1, tinted glass frosts it, and each field slides up over the previous one as a sheet with a 3.5rem top radius. Shadows are soft, deep and tinted by the local `--shade` (Royal shade on Royal, a green shade in the lime field). Every raised surface pairs a 1px white inset top highlight with a long, negatively spread drop.

### Shadow Vocabulary
- **Glass** (`inset 0 1px 0 oklch(1 0 0 / 20%), 0 1px 2px shade/40%, 0 48px 96px -44px shade`, with `backdrop-filter: blur(28px) saturate(150%)`): world panels, the demo, platform cards.
- **Solid** (`inset 0 1px 0 oklch(1 0 0 / 12%), 0 48px 96px -44px shade`): the same panel when nothing moves behind it.
- **Pill** (`inset 0 1px 0 oklch(1 0 0 / 28%), 0 14px 32px -16px shade`, blur 16px): every action pill.
- **Nav** (`inset 0 1px 0 oklch(1 0 0 / 22%), 0 20px 50px -30px shade`, blur 24px): the fixed nav pill.
- **Sheet** (`0 -28px 64px -36px`, Royal Night at 70%; pure black at 60% for the footer): the upward shadow of a rising field.
- **Card** (`0 30px 60px -32px shade`): the Royal folder tree inside the lime field.

### Named Rules
**The Glass Only Over Motion Rule.** Glass (`backdrop-filter`) is used only where something moves behind it: drift, page content under the nav, a field under a pill. Where nothing moves behind a panel, it is solid.

**The Transform-Only Glass Rule.** Glass panels enter with scale and translate only. Opacity or filter on a glass element, or on an ancestor of one, cuts it off from what it frosts.

**The Flat Inside Rule.** Inside a glass panel, regions are flat and divided by hairlines. Only code wells (the teacher screen, your local file, commands, shells) are sunken, filled with Royal Night or Royal at 50%.

## Shapes

Big soft geometry. Glass and solid panels have a 2.5rem radius and field sheets a 3.5rem top radius. Every action is a full pill. Icon tiles are 0.9 to 1rem squircles (the wordmark tile is 0.55rem). Numbered steps are full discs. Code wells use 1rem, command chips 0.8rem and shells 1.1rem. Stickers are 0.82em squares with a 0.24em radius, so they scale with the headline. Lines are hairlines from ink, 1 to 1.5px. Icons are Lucide outlines at a 2 to 2.5 stroke.

## Components

### Buttons
Tactile glass pills that end in a lime arrow chip.
- **Shape:** full pill (9999px), 3.5rem tall, with asymmetric padding (1.5rem left, 0.375rem right) so the 2.75rem chip nests flush at the right end.
- **Primary (pill):** translucent tint (46% of the local tint under a white gradient), 1px ink border at 34%, label weight 700 at ROND 30, and a lime chip (`nitro` on `nitro-ink`) holding the arrow.
- **Hover / Focus:** lifts 2px, the border goes to 62% ink, the label rounds to ROND 100, a light sheen sweeps across, and the chip nudges right and grows 6%, all on the spring. Active squashes to 0.93 by 0.86. Focus is the global 2px ring outline with a 3px offset.
- **Compact:** 2.75rem tall with a 2.25rem chip, used in the nav. **Wide:** full width, used in platform cards.
- **Icon button:** a 44px circle with a 1.5px inset ink ring; on hover it tints, rotates −25° and grows 10%.
- **Undo (Visszavonás):** a 44px ink-ringed pill at ROND 30. On hover it tints with ink, rounds to ROND 100 and turns its icon −30°.

### Chips
- **Ezt használod:** a lime pill (`nitro` on `nitro-ink`, 0.85rem/700) that appears only on the visitor's detected platform and pops in on the spring. The card gets a lime border at 70% and a lime icon tile.
- **Példa tag:** an ink-ringed 0.78rem pill marking demo data. Always present on sample content.

### Cards / Containers
- **Corner Style:** 2.5rem (glass and solid); 1.75rem for the tree card.
- **Background:** the Royal glass gradient (155deg, tint lift at 58% to tint at 74%) or solid `royal`.
- **Shadow Strategy:** Glass or Solid from Elevation.
- **Border:** 1px ink at 16%.
- **Internal Padding:** `clamp(1.75rem, 3vw, 3rem)`; the demo uses `clamp(1rem, 2vw, 1.5rem)`.

### Navigation
A fixed glass pill 0.75rem from the top: 4rem tall, Royal at 60% with blur 24px. Wordmark on the left (a Royal tile with the mark, which tilts −12° on hover), links in the center (0.95rem/600, soft ink, with a 2px full-ink underline that scales in from the left on hover), and a compact Letöltés pill on the right. Links hide at 980px.

### Spec Rows
A two-column definition list on subgrid: bold term, soft-ink value, a 0.8rem block pad, divided by 16% ink hairlines with no rule above the first row. It stacks at 560px. Spec rows are the system's replacement for feature cards. Numbered rows (models chain, setup steps) follow the same grammar with a 2.75rem Royal Ink disc.

### Kinetic Headline
Each letter is its own span carrying `wght` and `ROND`. With a fine pointer, letters within 320px swell to 900 and ROND 100 on a smoothstep falloff. With touch, a slow sine wave runs through the line. Letters land on the spring with a 28ms stagger. Stickers (lime with a code glyph, or ink with a monitor glyph) bob ±5°, grow 12% on hover, and spin once on click. The effect is skipped under reduced motion.

### Drift
Four rows of giant class words loop horizontally (34s, even rows 42s in reverse), letters alternate Royal Lift and Royal Glow, and each letter breathes between wght 520/ROND 0 and wght 900/ROND 100. The field is masked at its top and bottom edges and sits behind the world's glass only.

### Live Class Demo
One glass panel with a status bar (live dot, source, counters, Példa tag, replay) over a 2-by-2 grid of flat panes divided by hairlines: the teacher's screen (a sunken Royal Night well with a tab, line numbers and an active line), your local file (lime pane icon, fresh lines flash lime and fade over 1.4s), numbered notes, and the change log with a working undo for each change. Its section headline rounds to ROND 100 when the class resolves.

### Fields and Sheets
Full-width sections that rise over the previous one with a negative 3.5rem margin and a rounded top. There is one lime field per page at most. The deep Royal field holds solid panels and commands.

## Do's and Don'ts

### Do:
- **Do** keep lime on Royal limited to the visitor: stickers, pill arrow chips, focus and selection, "A te projekted", "Ezt használod".
- **Do** switch a field with `hue-royal` or `hue-nitro` so tint, ink, ring and counter-ink change together.
- **Do** use spec rows and hairlines (local ink at 16%) where another system would use a row of cards.
- **Do** animate glass with `scale` and `translate` only, and give every glass panel a solid fallback (phones at 560px and below, reduced transparency).
- **Do** use the spring for anything that lands, lifts or rounds, and Out for color and fades.
- **Do** carry state on the ROND axis: sharp while working, round when resolved or touched.
- **Do** label demo data with the Példa tag.

### Don't:
- **Don't** animate opacity or filter on a glass panel or any ancestor of one; it breaks `backdrop-filter`.
- **Don't** use glass where nothing moves behind it; use the solid panel.
- **Don't** raise or shadow regions inside a glass panel; only code wells sink.
- **Don't** run the drift on phones (560px and below), or put drift in front of content.
- **Don't** use lime for the teacher, the class or the product on Royal ground.
- **Don't** set more than one kinetic display line per page, or more than one lime field per page.
- **Don't** use a second typeface for display or UI; monospace is for code, paths and commands only.

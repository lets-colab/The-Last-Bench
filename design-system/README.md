# Last Bench Design System

Source of truth for the Last Bench brand as applied to this app.

- `tokens.json` — color, typography, voice, iconography, and motif tokens
  extracted from the official brand kit
- `logo.svg` — vector recreation of the logo for digital use
- `previews/` — self-contained HTML cards (colors, typography, logo), each
  tagged with a first-line `<!-- @dsCard group="…" -->` marker so they can be
  synced to a Claude Design (claude.ai/design) project with `/design-sync`
- Print-exact brand masters (banners, brand guide, logo lockups, event kit)
  live in `assets/branding/`

The app consumes the color tokens through `theme.config.js` (which feeds
Tailwind/NativeWind and `lib/_core/theme.ts`). If a token changes here,
change it there too — the two files list the same hex values.

## Surface rules

- `/` is the emotional, cinematic student journey. Its monsoon-to-daylight arc is
  purposeful and should not be copied into dense product screens.
- `/app/` is the working student product. It prioritizes legibility, honest data
  states, 44px touch targets, and persistent user-selected light/dark mode.
- `/class-lambda/` and `/colab/` use the same identity with restrained editorial
  layouts. They are connected pathways, not competing brands or alternate homepages.
- Anton + Space Grotesk belong to marketing surfaces. General Sans + Sora belong to
  the product UI. Do not mix the pairs inside one component.
- The Claude Design prototypes are visual references. Their demo names, metrics,
  deadlines, and messages must never ship as real student data.

The canonical route, truth-state, and accessibility rules live in `tokens.json`.
The complete product and operating boundary lives in `docs/LAST_BENCH_BLUEPRINT_V2.md`.

## Syncing to Claude Design

From a Claude Code session with design authorization (`/design-login`, or a
claude.ai session), run `/design-sync` against this directory. Remote sync is
not possible from unauthorized web sessions; in that case use Claude Design's
"Send to Claude Code Web" to seed the project instead.

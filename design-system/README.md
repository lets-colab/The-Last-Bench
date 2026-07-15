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

## Syncing to Claude Design

From a Claude Code session with design authorization (`/design-login`, or a
claude.ai session), run `/design-sync` against this directory. Remote sync is
not possible from unauthorized web sessions; in that case use Claude Design's
"Send to Claude Code Web" to seed the project instead.

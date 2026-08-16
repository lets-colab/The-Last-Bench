# design-sync notes — The Last Bench

Findings from sync attempts. Read before running `/design-sync` so the run
doesn't rediscover any of this.

## This repo is an app, not a component library

`package.json` has `"main": "expo-router/entry"` and no `exports` / `files`
field. There is **no library `dist/`**, so the package-shape converter has
nothing to bundle into `_ds_bundle.js`.

The components under `components/` and `app/` are React Native (via
`react-native-web`). They are not esbuild-bundlable into browser-renderable
components without a real library build that does not exist here. Do not
attempt to reimplement them for the bundle — the skill's core principle is
"ship what the customer already built", and a reimplementation would render
differently in every design the agent produces.

**Consequence:** a component-bundle sync is out of scope until this repo grows
a genuine library build (e.g. a `packages/ui` workspace with its own `dist/`).
Anyone who wants that should build the library first, then re-run design-sync.

## What IS legitimately syncable today

The brand foundation in `design-system/`, which is hand-authored and already in
the right format:

| File | Card group | Status |
|---|---|---|
| `design-system/previews/colors.html` | `Colors` | has `@dsCard` marker |
| `design-system/previews/logo.html` | `Brand` | has `@dsCard` marker |
| `design-system/previews/typography.html` | `Type` | has `@dsCard` marker |
| `design-system/tokens.json` | — | tokens source |
| `design-system/logo.svg` | — | asset |

All three previews carry a correct first-line `<!-- @dsCard group="…" -->`
marker, so the app builds its card index from them automatically and
`register_assets` is not needed.

This is a **foundation-only sync**: tokens, colour, type, logo. It gives the
design agent the brand vocabulary without pretending a component library
exists.

## Two defects found by rendering the cards (fix BEFORE the first upload)

All three cards were rendered in headless Chromium at 1200x800. None produced a
console error or a failed request, and the page background resolved to
`rgb(250, 250, 248)` — exactly the `warmWhite` token. But:

**1. `typography.html` ships no fonts, so it renders in fallback.**
The card sets `font-family: "Sora", system-ui, sans-serif` and
`font-family: "General Sans", "Archivo", system-ui, sans-serif`, but contains
**zero** `@font-face` rules, zero font-CDN links, and zero `.woff` references.
Neither typeface is installed in a clean browser, so it silently renders in
`system-ui`. Uploaded as-is, this card teaches the design agent the wrong
typefaces — and per the skill, a card that renders wrong here renders wrong in
every design the agent ever builds. Fix by embedding the real font files under
`fonts/` and `@import`ing them from `styles.css` (rendered designs receive only
that import closure), not by adding a CDN link.

**2. The design system names typefaces the app does not use.**

| Source | Display | Body |
|---|---|---|
| `design-system/tokens.json` | General Sans | Sora |
| `app/_layout.tsx` (what actually loads) | **Anton** | **Space Grotesk** |

`package.json` confirms the app side: `@expo-google-fonts/anton` and
`@expo-google-fonts/space-grotesk`. So the "source of truth" design system and
the shipping product disagree about the brand's typefaces.

This is a **brand decision, not a code fix** — do not guess which pair is
correct and do not silently rewrite either side. Whichever way it resolves, both
`tokens.json` and the app must end up agreeing, and the typography card must
embed the winning fonts.

## Token sync rule (do not break this)

`design-system/tokens.json` is the source of truth, but `theme.config.js`
duplicates the same hex values to feed Tailwind/NativeWind and
`lib/_core/theme.ts`. **If a colour token changes, change it in both** — see
`design-system/README.md`. A sync that edits tokens without updating
`theme.config.js` silently desyncs the app from its own design system.

## Authorization blocker (unresolved as of the last attempt)

`DesignSync` could not be authorized. Verbatim tool response:

> DesignSync needs design-system authorization, but /design-login requires an
> interactive terminal and is not available in this environment. If this is
> claude.ai/code, ask the user to use Claude Design's "Send to Claude Code Web"
> (which seeds the project into the workspace) or to provide the project files
> directly.

Also confirmed unreachable from this environment:

- `https://claude.ai/design/p/<id>` over WebFetch → **HTTP 403**
- `docs.netlify.com`, `dns.google`, `cloudflare-dns.com` → egress-blocked

So no target project was created and **nothing was uploaded**. No `projectId`
is pinned, which is the documented safe state: the next run is treated as a
first-time import and re-verifies everything.

**To unblock:** in Claude Design, open the project and use
**"Send to Claude Code Web"**. That both seeds the files into the workspace and
satisfies the authorization.

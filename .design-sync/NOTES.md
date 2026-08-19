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

## Update — real design files received (zip handoff)

The user supplied `LASTBENCH_3D.zip` directly, which is the fallback the
DesignSync error message itself names. It contained `Malaysia Experience
v2.dc.html`, `Last Bench Dashboard.dc.html`, `image-slot.js` (the file this
repo's `landing/` was missing), `support.js`, `assets/logo-icon.png`, and a
detailed handoff README. So the IMPORT direction is unblocked; only UPLOAD to
claude.ai/design still needs authorization.

### The typeface question is settled by evidence

Both shipping designs use **General Sans (display) + Sora (body)** and load
them for real (Fontshare + Google Fonts). Therefore:

- `design-system/tokens.json` (General Sans + Sora) is **correct**.
- `app/_layout.tsx` loading Anton + Space Grotesk is the **outlier**.
- `PRODUCT.md`'s "Display: Anton (site) / General Sans (app)" is contradicted
  by its own site design, which uses General Sans.

Do not "fix" tokens.json to match the app. Fix the app, or amend PRODUCT.md.

### New gap: no Bengali font

The designs load **Hind Siliguri** for the EN/বাংলা language toggle. This repo
ships no Bengali font, so Bengali renders in fallback.

### typography.html — partial fix applied, NOT verified

Added the exact font stylesheet links the shipping designs use, plus a Bengali
specimen row. **Could not verify it renders**: `api.fontshare.com` and
`fonts.googleapis.com` are both egress-blocked in the authoring sandbox, so
`document.fonts` registered 0 faces and the render still showed fallback.
Verify in a normal browser before trusting it.

**The better fix, still outstanding:** self-host the font files under `fonts/`
and reach them from `styles.css`'s `@import` closure — rendered designs receive
only that closure, so a CDN link proves nothing for designs and adds a runtime
dependency. Self-hosting was not possible here because the font binaries are
not in the repo (`assets/branding/` has none) and downloading them is
egress-blocked.

### Verified: the designs invent no facts

All 15 universities' figures in `Malaysia Experience v2.dc.html` match
`server/data/malaysia-universities.json` exactly on USD total, BDT lakh, IELTS,
EMGS category, and processing weeks (compare against `totalPerYear`, NOT
`tuitionPerYear`). Every "guarantee" string in both files is a disclaimer, and
the dashboard's AI prompt explicitly forbids stating fees or visa rates as fact.

Campus coordinates: the design supplies all 15 (UM/UTM/APU match this repo's
`CAMPUS_COORDS` exactly), but its README flags UiTM, HELP, UoC, Lincoln, MSU and
Limkokwing as vicinity approximations. Import the 9 accurate ones only. The
design carries no `svHeading`, which this repo's `CAMPUS_COORDS` needs.

## SYNC COMPLETED — 2026-08-19

`/design-consent` granted design-agent access and DesignSync authorized. The
foundation sync ran end to end.

- **Target:** project `e48d1fb3-af2d-4eaf-8457-fcbdcd9d040c` ("Design System"),
  reused because `list_files` confirmed it was completely empty. The other
  same-named project (`6da688ff-…`) holds 14 user-uploaded PNGs and was left
  untouched.
- **Uploaded (7 files):** `styles.css`, `tokens/tokens.css`, `README.md`,
  and three cards under `components/{Colors/Palette,Brand/Logo,Type/Typography}`
  plus `logo.svg`.
- **Reconciliation:** remote listing matched the bundle exactly; no orphans to
  delete.

### Off-script build (deliberate)

`package-build.mjs` was never run — it requires a component library with a
compiled `dist/` and would exit `[NO_DIST]` / `[ZERO_MATCH]` here. Per the base
skill's escape hatch, the layout was produced by hand. Verification was NOT
skipped: all three cards were rendered from inside the bundle in headless
Chromium and confirmed to resolve `--lb-color-brand-green` through the
`styles.css` @import closure, load their images, and throw no page errors.

### `_ds_sync.json` intentionally omitted

The anchor envelope (`bundleSha12`, `scriptsSha`, `renderHashes`…) can only be
computed by the converter, which did not run. Omitting it is the honest choice:
the next sync simply has no anchor and re-verifies everything. Do not
hand-fabricate one.

### Bug found and fixed during the build

`logo.html` referenced `../logo.svg`, which resolved in
`design-system/previews/` but pointed at nothing once moved to
`components/Brand/Logo/`. Fixed to `./logo.svg` with the asset co-located. Watch
for this whenever a card moves depth.

### Still outstanding

- Typography card's webfonts remain **unverified** (Fontshare + Google Fonts
  egress-blocked in the build sandbox). User accepted this knowingly.
- Self-hosting the woff2 files under `fonts/` is the correct fix and removes the
  runtime CDN dependency. Needs the font binaries, which are not in the repo.

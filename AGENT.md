# AGENT.md — Operating Manual for AI Agents Working on Last Bench

This file is the handoff brief. Any AI agent (Claude, GPT, Gemini, a local model via
Ollama — anything) picking up this project should read this file first and follow it.
Paste it into the system prompt / project instructions of whatever agent you use.

---

## 1. What Last Bench is

**Mission:** An AI platform guiding Bangladeshi secondary-school students through their
study-abroad journey to Malaysia. Not a consultancy — a transparent, always-on platform.
Tagline: *For Those Who Last, To Create a Benchmark.*

**Non-negotiable product principles** (from `design.md` — read it in full):

1. **Clarity First** — every screen shows where the student stands and what comes next.
2. **Trust Through Transparency** — never fake data. Manual updates are labeled
   ("Updated by [name]"), AI recommendations show reasoning. **No hardcoded demo
   numbers shown as if real.** This rule has been violated before (the home dashboard
   shipped with fabricated stats) and was fixed; do not reintroduce it.
3. **Mentor-like tone** — supportive older sibling, not corporate.
4. **Mobile-first, one-handed** (portrait, thumb-reachable actions).
5. **Community over transaction.**

**AI advisor rules** (already enforced in `server/routers.ts` `aiGuidance.chat` — keep them):
only cite universities from the verified database, never invent acceptance rates / costs /
visa stats, escalate to human mentors for high-stakes decisions, GPA scale is 5.0.

---

## 2. Architecture and release contract (updated 2026-07-27)

```
Repo: lets-colab/LastBenchBd      (canonical; lets-colab/The-Last-Bench is the legacy repo name)

app/          Expo Router (React Native Web) — student/tutor/admin UI, tabs + stack
server/       Express + tRPC v11 — 55 procedures across 15 routers
  _core/      index.ts (entry), oauth.ts (Manus OAuth), llm.ts (LLM proxy), storageProxy.ts
  db.ts       All DB access — drizzle-orm/postgres-js against Supabase Postgres
  routers.ts  auth, student, application, document, tutor, referral, mentor, message,
              cohort, university, skill, notification, admin, aiGuidance, selfHealing
  self-healing.ts  Redacted fingerprinting → safe transient retry → advisory diagnosis
                   stored in errorLogs/errorFixes; generated fixes require approval
drizzle/      schema.ts (16 pg tables) + generated SQL migrations
landing/      Static cinematic marketing site + /class-lambda/ and /colab/ ecosystem routes
scripts/build-site.mjs  Assembles dist/: landing/ at /, Expo web export at /app
server-dist/  Generated API bundle — Render builds this; never publish it as web content
dist/         Generated web artifact — Netlify builds it with production public values
```

**One merged site (as of the 2026-07-23 site/app merge — do not re-split these):**
`pnpm build:web` runs `scripts/build-site.mjs`, which exports the Expo app with
`EXPO_BASE_URL=/app` into `dist/app/` and copies `landing/` into `dist/` unchanged.
Netlify serves it all from one site (`netlify.toml`): `/` is the marketing landing
page, `/app/*` is the student app, `/class-lambda/` is the talent pathway, and
`/colab/` is the connected venture pathway (SPA-fallback redirect keeps client-side routes
like `/app/profile` working). The landing page's "Sign up"/"Student login" links
point at `/app` (relative — works on any domain/preview URL). There is no more
separate GitHub Pages deploy; `.github/workflows/deploy-pages.yml` was removed.

**Only supported production topology:**

| Surface | Host | Source | Trigger |
|---|---|---|---|
| Whole site (landing at `/`, app at `/app`) | Netlify, site `exitbd` → exitbd.netlify.app | `pnpm build:web:production` → generated `dist/` | push to `main` |
| API server | Render (`render.yaml`, `last-bench-api`, Singapore) | `pnpm build` → `server-dist/index.js`; `pnpm start` | Render git integration |
| Database | Supabase Postgres 17, project `tocxdyqlrvzthpexnmxe` (ap-southeast-1) | — | — |

- Netlify is the only web deployment and Render is the only API deployment. Vercel
  configuration has been removed and GitHub Pages must remain disabled.
- A push, passing CI, or successful static deploy does **not** prove the product is live.
  The release is complete only after both the Render health endpoint and the rendered
  Netlify app pass the checks in section 3.
- `EXPO_PUBLIC_API_BASE_URL` is baked into the browser bundle. Configure every
  `EXPO_PUBLIC_*` value in Netlify; the production build refuses missing, insecure,
  or placeholder values. Production must not fall back to sending `/api/*` to the
  static Netlify site.
- Production web auth must use the same-site API origin
  `https://api.lastbenchbd.com`, attached as a Render custom domain. Do not release
  the canonical `www` site against an `onrender.com` API origin: third-party-cookie
  blocking can otherwise break login and returning sessions.
- File storage: metadata in Postgres (`documents` table), bytes in S3 via the "Forge"
  presign broker (`server/storage.ts`); downloads proxied at `/manus-storage/*`.
- Auth today: Manus OAuth (`oauth.manus.space`) + JWT cookie. Social login (Google/FB)
  is NOT yet implemented — planned route is Supabase Auth (see roadmap).
- **`FRONTEND_URL` must be set on Render** (e.g. `https://www.lastbenchbd.com`) —
  the OAuth callback redirects to `${FRONTEND_URL}/app` after login. Without it,
  this fell back to `http://localhost:8081` for every real user in production —
  found and fixed 2026-07-23; don't reintroduce the un-set fallback as the primary path.
- Render also requires `CORS_ALLOWED_ORIGINS`, `TRUST_PROXY_HOPS=1`, and
  `AI_GUIDANCE_MODEL`. Keep allowed origins narrow (canonical domain plus the active
  Netlify fallback/preview origin). The model ID must be supported by the configured
  Forge gateway.
- `BUILT_IN_FORGE_API_URL` is not an Anthropic base URL. This code also uses
  Forge-specific storage, notification, image, transcription, and related endpoints;
  use the project Forge-compatible gateway.
- Supabase free tier **auto-pauses after ~1 week idle**. Symptom: all DB calls fail.
  Fix: restore from the Supabase dashboard (or MCP `restore_project`), takes ~2 min.
- RLS is ENABLED on all 16 tables with **no policies** (default-deny for anon/authenticated
  REST access). This is intentional: the server connects as the table owner and bypasses
  RLS. If you add Supabase client-side access, you must write policies.
- Domain: point `www.lastbenchbd.com` (CNAME → `exitbd.netlify.app`) and add it as a
  custom domain on the Netlify site — that's the single front door now (no more `app.`
  subdomain plan; the app lives at `www.lastbenchbd.com/app`).

**Domain (user owns lastbenchbd.com):** one host now — `www.lastbenchbd.com` → Netlify
`exitbd` (landing at `/`, app at `/app`). DNS record needed at the registrar (only
action left that requires the owner — no registrar access exists in this session):

```
CNAME  www  exitbd.netlify.app        (also add the domain in Netlify site settings)
# Add api.lastbenchbd.com using the exact DNS target shown by Render's custom-domain screen.
```

---

## 3. How to verify your work (do this before claiming anything is done)

```bash
pnpm install                 # once
pnpm check                   # tsc --noEmit — must be clean
pnpm test                    # vitest — all tests must pass
pnpm audit --prod --audit-level critical
pnpm build                   # server bundle (esbuild → server-dist/index.js)
pnpm build:web               # local/offline Expo web export → ignored dist/
pnpm build:web:production    # Netlify path; requires real EXPO_PUBLIC_* values
```

CI exercises the production build contract with non-sensitive validation values.
Netlify rebuilds the ignored artifact with its own production public configuration;
never deploy a locally generated `dist/` as a substitute for that build.
Netlify deploy previews use committed `.invalid` values so UI review remains
available before production credentials exist; the preview app must therefore show
its explicit service-unavailable state instead of pretending its backend is live.

**Post-deploy release gate:**

```bash
API_ORIGIN=https://replace-with-render-service.onrender.com
WEB_ORIGIN=https://www.lastbenchbd.com

curl --fail --silent --show-error "$API_ORIGIN/api/health"
curl --fail --silent --show-error --output /dev/null "$WEB_ORIGIN/"
curl --fail --silent --show-error --output /dev/null "$WEB_ORIGIN/app/"
curl --fail --silent --show-error --output /dev/null "$WEB_ORIGIN/class-lambda/"
curl --fail --silent --show-error --output /dev/null "$WEB_ORIGIN/colab/"
```

Then test the rendered `/app/` in a fresh browser: no permanent loader, no console
errors, successful login/logout, and one real authenticated API query. A `200` response
whose content type is HTML does not count as a successful API response.

**Standards observed on this project — keep them:**

- Verify empirically, not by reading code alone. Boot the built app (`npx serve dist`)
  and check it in a headless browser before declaring UI work done.
- When you find something broken that you can't fix now, SAY SO explicitly in your
  report. Never bury or omit a known gap.
- Never hardcode placeholder/demo data in user-facing screens (see principle 2).
- Conventional commits (`fix:`, `feat:`, `build:`, `docs:`).
- New features need the full chain: schema (if data) → `server/db.ts` helper →
  tRPC procedure in `routers.ts` → UI screen wired via `trpc.<router>.<proc>.useQuery/useMutation`.
- DB changes: edit `drizzle/schema.ts`, generate and review SQL, then apply the reviewed
  migration deliberately through the Supabase migration/SQL workflow. **Production
  server startup and Render deploy commands must never create or alter tables.** Do
  not point `pnpm db:push` at production and do not add automatic DDL back to startup.

---

## 4. Current state — what is real vs. gap (audited 2026-07-23)

**Real and working:** student profile + onboarding; applications pipeline with 11-stage
tracking (real timeline + documents + mentor notes on `app/application-detail.tsx`);
document metadata + storage plumbing; tutor referral/commission/payout system with audit
logs; cohorts + cohort discussions; messages tab with a real conversation list
(`message.getConversations`) and two-directional threads; three-persona AI advisor
("AI Guides" tab — Sayem/Fahim/Erfan, real co-founders, see below) with persistent
per-guide chat history (`aiChatMessages.guide`) and shared per-student memory
(`aiMemories`), grounded on a verified Malaysia university dataset; admin dashboard
(students/applications/tutors/payouts/analytics); notifications; privacy-bounded error
engine; home dashboard wired to real data; bench-icon loading indicator
(`components/bench-loader.tsx`) on every full-screen/section loading state and on
initial JS bundle load (`scripts/build-site.mjs` injects it into the exported HTML shell).

**AI Guides — design source and what's imported (2026-07-23):** a Claude Design project
("3D Malaysian Cinematic Experience", `b1b8d436-bfc0-46ca-a294-c03dba13ebb1`) contains a
high-fidelity dashboard reference (`Last Bench Dashboard.dc.html` + README) naming three
real co-founders whose AI personas run the app: **Sayem Ahmed** (CEO, main journey AI),
**Fahim Shahbaz** (career/university-matching AI), **Erfan Uddin** (community AI — this
is the account owner running this session). Implemented so far: the three-persona chat
backend (`server/routers.ts` `AI_GUIDES` + `aiGuidance.chat/getChatHistory`, each with its
own system prompt, all grounded — no canned/scripted replies, unlike the design mockup's
prototype JS) and the `app/(tabs)/ai-guidance.tsx` screen (now in the tab bar). Needs
before it's fully production-ready:
- **Apply the schema migration** — `drizzle/0002_ai_guide_personas.sql` (adds the
  `ai_guide` enum + `aiChatMessages.guide` column) is written but NOT yet applied to the
  live Supabase project (no DB credential available in this session to run it, and the
  project's migration journal is already out of sync with reality — see the note below).
  Apply it via the Supabase SQL editor or `apply_migration` MCP before this feature works
  in production; until then `aiGuidance.chat` will error on the missing column.
- **Founder photos** — the design uses circular photo slots per founder; production needs
  real photos of Sayem, Fahim, and Erfan (ask the owner).
- **Universities** discovery screen — BUILT (`app/(tabs)/universities.tsx`, in the tab bar
  in place of the now-hidden `discover`). It is deliberately a stable directory, not
  an admissions predictor: time-sensitive fees, rankings, requirements, visa odds, and
  derived match percentages stay out until a verified source and review date are
  available. Campus views help students understand the setting; every application
  decision still requires current programme and entry-detail verification.
- Still not built from the design: the **Documents** tracker view (the `documents` backend
  exists; needs the tracker UI + a file picker — see gap #1). Real, scoped, not done yet.
- **This project's migration journal is stale**: `drizzle/meta/_journal.json` only has 2
  entries, but the live DB has 16 tables including several (payouts, auditLogs,
  cohortMessages) added directly via Supabase SQL, never through `drizzle-kit generate`.
  Don't run `drizzle-kit migrate` expecting it to reconcile this — hand-write and
  hand-apply SQL files like `0002_ai_guide_personas.sql` until someone reconciles the
  journal against the live schema properly.

**Known gaps, in priority order:**

1. **No file-picker UI anywhere** — `document.upload` / `student.uploadTranscript`
   backends exist but no screen calls them. Add expo-document-picker flow.
2. **No leads capture** — landing form posts to Netlify Forms (leads live in the
   Netlify dashboard, disconnected from the DB). For Meta ads attribution +
   outbound-call automation: add a `leads` table + public tRPC endpoint capturing
   `fbclid`/UTM, point the form at it, then integrate a telephony provider
   (Twilio/Vonage — needs an account + Bangladesh calling compliance decision).
3. **Social login** — replace Manus OAuth with Supabase Auth (Google first; Facebook
   needs Meta business verification + app review, which takes weeks). Requires the
   owner to create provider credentials; agent scaffolds code + env vars.
4. **Campus 360° coordinate coverage** — only 5 of 15 universities have verified Street
   View coordinates (`CAMPUS_COORDS` in `universities.tsx`); the other 10 fall back to a
   satellite map. Add real lat/lng for the rest to give them true 360° walks. No API key
   needed (`output=svembed` is free).
5. **`app/(tabs)/discover.tsx` duplicates the AI Guides chat and community.tsx's
   cohorts/skills** — pre-existing redundancy (three screens doing overlapping things:
   `discover.tsx`, `community.tsx`, `ai-guidance.tsx`). `discover.tsx`'s "AI Advisor"
   segment was patched to default to Sayem's guide so it compiles, but the real fix is
   to remove the duplicate chat UI there and point it at the AI Guides tab.
6. **Production infrastructure still needs a live release-gate pass** — confirm the
   actual Render origin, configure the public build variables in Netlify, deploy, and
   run section 3. Do not describe the API as live from `render.yaml` alone.
7. Keep every Dependabot alert visible and triaged. CI blocks critical production
   dependency findings; high/moderate findings still require review and planned fixes.

---

## 5. Bootstrap prompt for a replacement agent

Paste this (plus this whole file) as the system/project prompt:

> You are the lead engineer-agent for Last Bench (lets-colab/The-Last-Bench), an AI
> platform guiding Bangladeshi students to study in Malaysia. Read AGENT.md and
> design.md before any change. Operate autonomously but honestly: verify every claim
> by running the commands in AGENT.md §3; report failures and gaps plainly instead of
> hiding them; never invent data shown to users; never summarize away a known problem.
> Work in small verified increments: schema → db helper → tRPC procedure → UI → test →
> build → commit (conventional commits) → push to a feature branch → PR. When something
> needs an external credential or a business decision (DNS, OAuth apps, telephony,
> payments), stop and ask the owner rather than faking it. Priorities are AGENT.md §4
> in order, unless the owner redirects.

**Model guidance (2026):** this project does not need the most expensive model.
Claude Sonnet-tier (or an equivalent) handles all of §4. Use a top-tier model only for
one-off architecture decisions. For free/local: Ollama + `qwen2.5-coder:14b` or
`deepseek-coder-v2:16b` on a 16 GB machine, driven by an open agent harness (Aider,
Cline, or OpenHands). Local models are fine for scoped, well-specified tasks like §4
items 1–3; keep cloud models for cross-cutting refactors like item 5.

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

## 2. Architecture (verified as of 2026-07-23)

```
Repo: lets-colab/The-Last-Bench   (canonical; letsco-lab/The-Last-Bench is a stale fork)

app/          Expo Router (React Native Web) — student/tutor/admin UI, tabs + stack
server/       Express + tRPC v11 — 55 procedures across 15 routers
  _core/      index.ts (entry), oauth.ts (Manus OAuth), llm.ts (LLM proxy), storageProxy.ts
  db.ts       All DB access — drizzle-orm/postgres-js against Supabase Postgres
  routers.ts  auth, student, application, document, tutor, referral, mentor, message,
              cohort, university, skill, notification, admin, aiGuidance, selfHealing
  self-healing.ts  Error fingerprinting → auto-retry/reconnect/fallback → LLM diagnosis
                   stored in errorLogs/errorFixes; learns which fix strategies work
drizzle/      schema.ts (16 pg tables) + generated SQL migrations
landing/      Static cinematic marketing site (no build step) — "Malaysia Experience"
scripts/build-site.mjs  Assembles dist/: landing/ at /, Expo web export at /app
dist/         COMMITTED build output — Netlify deploys this. Rebuild + commit together.
```

**One merged site (as of the 2026-07-23 site/app merge — do not re-split these):**
`pnpm build:web` runs `scripts/build-site.mjs`, which exports the Expo app with
`EXPO_BASE_URL=/app` into `dist/app/` and copies `landing/` into `dist/` unchanged.
Netlify serves it all from one site (`netlify.toml`): `/` is the marketing landing
page, `/app/*` is the student app (SPA-fallback redirect keeps client-side routes
like `/app/profile` working). The landing page's "Sign up"/"Student login" links
point at `/app` (relative — works on any domain/preview URL). There is no more
separate GitHub Pages deploy; `.github/workflows/deploy-pages.yml` was removed.

**Deploy topology (all verified live):**

| Surface | Host | Source | Trigger |
|---|---|---|---|
| Whole site (landing at `/`, app at `/app`) | Netlify, site `exitbd` → exitbd.netlify.app | committed `dist/` (built by `scripts/build-site.mjs`) | push to `main` |
| API server | Render (`render.yaml`, `last-bench-api`, Singapore) | `pnpm build` → `dist/index.js` | Render git integration |
| Database | Supabase Postgres 17, project `tocxdyqlrvzthpexnmxe` (ap-southeast-1) | — | — |

- Vercel: `vercel.json` exists but **no Vercel project is linked — it is dead config**.
- File storage: metadata in Postgres (`documents` table), bytes in S3 via the "Forge"
  presign broker (`server/storage.ts`); downloads proxied at `/manus-storage/*`.
- Auth today: Manus OAuth (`oauth.manus.space`) + JWT cookie. Social login (Google/FB)
  is NOT yet implemented — planned route is Supabase Auth (see roadmap).
- **`FRONTEND_URL` must be set on Render** (e.g. `https://www.lastbenchbd.com`) —
  the OAuth callback redirects to `${FRONTEND_URL}/app` after login. Without it,
  this fell back to `http://localhost:8081` for every real user in production —
  found and fixed 2026-07-23; don't reintroduce the un-set fallback as the primary path.
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
```

---

## 3. How to verify your work (do this before claiming anything is done)

```bash
pnpm install                 # once
pnpm check                   # tsc --noEmit — must be clean
pnpm test                    # vitest — must pass (13 tests as of writing)
pnpm build                   # server bundle (esbuild → dist/index.js)
pnpm build:web               # Expo web export → dist/ (COMMIT the dist changes)
```

**Standards observed on this project — keep them:**

- Verify empirically, not by reading code alone. Boot the built app (`npx serve dist`)
  and check it in a headless browser before declaring UI work done.
- When you find something broken that you can't fix now, SAY SO explicitly in your
  report. Never bury or omit a known gap.
- Never hardcode placeholder/demo data in user-facing screens (see principle 2).
- Conventional commits (`fix:`, `feat:`, `build:`, `docs:`).
- New features need the full chain: schema (if data) → `server/db.ts` helper →
  tRPC procedure in `routers.ts` → UI screen wired via `trpc.<router>.<proc>.useQuery/useMutation`.
- DB changes: edit `drizzle/schema.ts`, run `pnpm db:push` with `DATABASE_URL` set
  (or apply via Supabase migration), commit the generated SQL.

---

## 4. Current state — what is real vs. gap (audited 2026-07-23)

**Real and working:** student profile + onboarding; applications pipeline with 11-stage
tracking; document metadata + storage plumbing; tutor referral/commission/payout system
with audit logs; cohorts + cohort discussions; AI advisor chat with persistent per-student
memory (`aiChatMessages`/`aiMemories`) grounded on a verified Malaysia university dataset;
admin dashboard (students/applications/tutors/payouts/analytics); notifications;
self-healing error engine; home dashboard wired to real data (fixed 2026-07-22).

**Known gaps, in priority order:**

1. **Messages tab conversation list is mock data** (`app/(tabs)/messages.tsx` —
   hardcoded "Sarah Johnson"/"Dr. Ahmed Hassan", fake auto-replies). The send/thread
   backend is real but there is no "list my conversations" endpoint. Fix: add a
   `message.getConversations` tRPC query (distinct counterparties + last message +
   unread count) and wire the tab to it.
2. **`app/application-detail.tsx` hardcodes mentor name** — look up the real
   `mentorAssigned` user.
3. **No file-picker UI anywhere** — `document.upload` / `student.uploadTranscript`
   backends exist but no screen calls them. Add expo-document-picker flow.
4. **No leads capture** — landing form posts to Netlify Forms (leads live in the
   Netlify dashboard, disconnected from the DB). For Meta ads attribution +
   outbound-call automation: add a `leads` table + public tRPC endpoint capturing
   `fbclid`/UTM, point the form at it, then integrate a telephony provider
   (Twilio/Vonage — needs an account + Bangladesh calling compliance decision).
5. **Social login** — replace Manus OAuth with Supabase Auth (Google first; Facebook
   needs Meta business verification + app review, which takes weeks). Requires the
   owner to create provider credentials; agent scaffolds code + env vars.
6. **Campus "virtual visit"** — currently a static satellite iframe per university.
   Real version needs Google Maps Platform key (Street View Embed/Static API).
7. **`.env.example` Forge URL guidance is wrong** — `BUILT_IN_FORGE_API_URL` example
   says `api.anthropic.com`, but `storage.ts` calls `/v1/storage/presign/*` on that
   host, which is a Manus/Forge endpoint, not Anthropic. Verify what's actually set
   in Render before touching storage.
8. 2 Dependabot alerts on main (1 high, 1 moderate) — uninvestigated.

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

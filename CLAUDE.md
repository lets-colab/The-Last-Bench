# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Companion documents — read before changing anything

| File | What it governs |
|---|---|
| `AGENT.md` | Engineering handoff brief: verified deploy topology, current real-vs-gap audit, prioritized gap list. **The authority on "what is actually built."** |
| `AGENTS.md` | Brand/content guardrails for anything user-facing (copy, marketing, AI advisor tone). Applies repo-wide. |
| `design.md` | The five product principles. Principle 2 (never fake data) is enforced in code review. |
| `design-system/README.md` | Token → `theme.config.js` sync rule, and the `/design-sync` flow. |
| `server/README.md` | Upstream template's backend guide (auth/db/tRPC/storage patterns). |

## Commands

```bash
pnpm install
pnpm dev            # server (tsx watch) + Metro web, concurrently
pnpm dev:server     # API only, port from server/_core/env.ts
pnpm dev:metro      # Expo web only, EXPO_PORT or 8081

pnpm check          # tsc --noEmit — must be clean before any commit
pnpm test           # vitest run
pnpm lint           # expo lint
pnpm build          # esbuild server → dist/index.js (Render runs this)
pnpm build:web      # scripts/build-site.mjs → assembles the whole dist/ site
```

Single test / focused run (there is no `vitest.config.*`; vitest auto-discovers `tests/*.test.ts`):

```bash
pnpm vitest run tests/university-match.test.ts
pnpm vitest run -t "visa"          # by test name
pnpm vitest                        # watch mode
```

Serve the built site exactly as Netlify does — from `dist` root, then open `/app`:

```bash
pnpm build:web && npx serve dist    # NOT `serve dist/app` — that 404s on /app/_expo/*
```

## Architecture

Single repo, three deployed surfaces, one merged front door.

```
app/        Expo Router (React Native Web). (tabs)/ = student nav; admin/, tutor/, cohort/, oauth/ = stacks.
server/     Express + tRPC v11.  _core/ is framework code — treat as vendored, don't edit.
  db.ts     ALL database access (drizzle-orm/postgres-js → Supabase Postgres).
  routers.ts  One appRouter composed of ~15 nested routers.
  self-healing.ts  Error fingerprint → retry/reconnect/fallback → LLM diagnosis, persisted to errorLogs/errorFixes.
drizzle/    schema.ts (16 pg tables) + hand-maintained SQL migrations.
landing/    Static cinematic marketing site. No build step — plain files.
shared/     Isomorphic pure logic (university-match.ts, payout.ts) — unit-tested, no I/O. Put business rules here.
dist/       COMMITTED build output. Netlify deploys this directly.
```

**The site and the app are one Netlify site — do not re-split them.** `pnpm build:web` runs `scripts/build-site.mjs`, which exports Expo web with `EXPO_BASE_URL=/app` into `dist/app/`, copies `landing/` into `dist/` unchanged, and injects an animated bench SVG into the exported HTML shell so the boot screen is never blank. `netlify.toml` has **no build command** — it publishes committed `dist/`. So **any change to `app/`, `landing/`, or `components/` requires `pnpm build:web` and committing the `dist/` diff in the same commit**, or production silently keeps serving the old bundle.

Redirect order in `netlify.toml` is load-bearing: `/app/*` → `/app/index.html` must precede the `/*` landing catch-all.

**Request path:** UI calls `trpc.<router>.<proc>.useQuery/useMutation` → `EXPO_PUBLIC_API_BASE_URL` → Express on Render → `server/db.ts` → Supabase. superjson transformer on both ends.

**Procedure tiers** (`server/_core/trpc.ts`): `publicProcedure` (wrapped in the self-healing guard), `protectedProcedure` (adds `requireUser`), `adminProcedure`. Every new procedure must pick the narrowest tier — `document.*` has a known IDOR from getting this wrong.

**Adding a feature** — the full chain, in order: `drizzle/schema.ts` → helper in `server/db.ts` → procedure in `server/routers.ts` → screen wired via tRPC hook → test in `tests/` → `pnpm check && pnpm test` → `pnpm build:web` + commit `dist/`.

Platform-specific files use Metro resolution: `components/campus-view.tsx` (native) vs `.web.tsx` (web). Web gets a keyless Google Street View embed (`output=svembed`); native opens Google Maps.

## Project-specific traps

- **The migration journal is stale.** `drizzle/meta/_journal.json` has 2 entries; the live DB has 16 tables, several added directly via Supabase SQL. **Do not run `drizzle-kit migrate` expecting reconciliation** — hand-write and hand-apply SQL like `drizzle/0002_ai_guide_personas.sql`. Never add boot-time DDL to `server/db.ts` (was tried, correctly reverted).
- **`drizzle/0002_ai_guide_personas.sql` is committed but NOT applied to the live database.** Until it is, `aiGuidance.chat` errors on the missing `ai_chat_messages.guide` column.
- **RLS is enabled on all 16 tables with zero policies** — deliberate default-deny. The server connects as table owner and bypasses it. Adding any client-side Supabase access requires writing policies first.
- **Supabase free tier auto-pauses after ~1 week idle**; every DB call then fails. Restore via dashboard or MCP `restore_project` (~2 min).
- **`FRONTEND_URL` must be set on Render** (it's in `render.yaml` but not `.env.example`). Unset, OAuth redirected every production user to `localhost:8081` — a real shipped bug. Don't make the localhost fallback the primary path again.
- **`vercel.json` is dead config** — no Vercel project is linked. Netlify + Render only.
- **`.env.example`'s `BUILT_IN_FORGE_API_URL` example is wrong** (says `api.anthropic.com`; `server/storage.ts` calls Manus/Forge presign endpoints). Check Render's actual value before touching storage.
- **`app/(tabs)/discover.tsx` overlaps `community.tsx` and `ai-guidance.tsx`** — known pre-existing redundancy, not a bug to "fix" incidentally.
- GPA scale is **5.0** (Bangladeshi), not 4.0.

## Non-negotiables

**Never render fabricated data in user-facing screens.** The home dashboard once shipped with invented stats ("2 of 5", fake mentor names) and application-detail with a fake MIT application; both were ripped out. Empty states must be honest. Match scores come from `shared/university-match.ts` (deterministic, tested) — never illustrative percentages.

The AI advisor must only cite universities from the verified dataset, and must never invent acceptance rates, costs, fees, visa statistics, processing times, partnerships, testimonials, or mentor response times. Last Bench is a transparent student accelerator — **not** a consultancy, and not a guarantee of admission, visa, or employment outcomes. Never describe canned prototype UI as "live AI."

Verify empirically before claiming completion: boot the built site and check it, don't infer from reading code. When something is broken and you can't fix it now, say so explicitly rather than omitting it.

Conventional commits (`feat:`, `fix:`, `build:`, `docs:`).

## Knowledge tooling (mempalace + graphify)

Both are installed as `uv` tools and indexed against this repo. Neither needs an LLM API key.

```bash
graphify update . --no-cluster      # rebuild code graph → graphify-out/graph.json
graphify explain "getMessagesBetween"
graphify path "ai-guidance.tsx" "db.ts"

mempalace mine .                    # (re)index files into the palace
mempalace search "how does OAuth redirect after login"
mempalace status
```

Use `mempalace search` for "where/why is this done" questions and `graphify path/explain` for call-graph questions — both are far cheaper than grepping across 125 source files. Re-run `graphify update .` and `mempalace mine .` after large changes. `graphify-out/` and `mempalace.yaml` are local artifacts.

Known extractor noise, not real errors: graphify reports syntax errors in `profile.tsx`, `notifications-settings.tsx`, and `shared/types.ts`, and skips `.sql` files (needs `graphifyy[sql]`). `pnpm check` is the authority on whether TypeScript is actually valid.

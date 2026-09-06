# Last Bench

> **Bangladesh → Malaysia student accelerator and digital journey platform.**
>
> We help Bangladeshi students study, settle and succeed in Malaysia through clearer guidance, transparent progress tracking, verified information, community support and human escalation when a decision needs expert review.

**Repository:** `lets-colab/LastBenchBd`  
**Status:** Active development — production release still requires the external configuration and release-gate checks listed below.  
**Last README review:** 6 September 2026

---

## What Last Bench is

Last Bench is being built as a student-first platform, not a traditional consultancy website. The product is designed to guide students from uncertainty to a clear next action across university discovery, applications, documents, communication, community and AI-assisted guidance.

Core product principles:

1. **Clarity first** — show where the student stands and what comes next.
2. **Trust through transparency** — never present fabricated or placeholder data as real.
3. **Mentor-like guidance** — supportive, direct and human rather than corporate.
4. **Mobile-first** — designed for the devices and connectivity conditions students actually use.
5. **Community over transaction** — the relationship should continue beyond a single admission.

For deeper product and brand context, read [`PRODUCT.md`](./PRODUCT.md), [`design.md`](./design.md) and [`AGENT.md`](./AGENT.md).

---

## Product surfaces

This repository contains one connected product system:

| Surface | Purpose | Main location |
| --- | --- | --- |
| Marketing site | Cinematic introduction, trust building and student lead capture | `landing/` |
| Student app | Journey dashboard, applications, universities, messages, community, AI guides and profile | `app/` |
| API | Authenticated product and business logic | `server/` |
| Database | Postgres schema and migrations | `drizzle/` |
| Shared logic | Cross-surface types and product logic | `shared/` |
| Design system | Product visual system and implementation references | `design-system/`, `design.md` |
| Tests | Product, privacy, auth, CORS and matching verification | `tests/` |

The web release is assembled as a **single site**: the marketing experience is served at `/`, while the student application is served at `/app`.

---

## What is already built

The current codebase includes:

- Student profile and onboarding
- Student journey dashboard connected to real backend data
- Multi-stage application tracking and application-detail views
- University discovery and comparison
- Verified Malaysia university dataset used by product logic
- Messaging and two-way conversation threads
- Community and cohort experiences
- Tutor referral, commission and payout flows
- Notifications and notification settings
- Admin views for students, applications, tutors, payouts and analytics
- Three AI Guides representing **Sayem, Fahim and Erfan**, with persistent guide-specific chat history and student memory
- Privacy-bounded error diagnostics / self-healing support
- Cinematic marketing landing experience
- Netlify lead form with explicit WhatsApp consent and Bangladesh phone validation
- Mobile/web loading, empty, error and service-unavailable states
- Automated type, lint, test, production-build and dependency-audit checks in CI

### Important product rule

AI guidance must stay grounded in verified project data. Do not invent university acceptance rates, fees, rankings, visa probabilities, scholarship certainty or other high-stakes facts. Escalate decisions that require current human verification.

---

## Architecture

```text
landing/                 Static marketing experience
app/                     Expo Router / React Native student, tutor and admin UI
components/              Shared UI components
server/                  Express + tRPC API
server/db.ts             Database access layer
server/routers.ts        Product/API procedures
server/self-healing.ts   Redacted diagnostics and safe retry/advisory logic
drizzle/                 Postgres schema + migrations
shared/                  Shared application logic and types
design-system/           Design-system implementation resources
scripts/                 Build, validation and utility scripts
tests/                   Vitest test suite
```

### Core stack

- **Expo 54 / React Native 0.81 / React 19**
- **Expo Router 6**
- **TypeScript 5.9**
- **NativeWind / Tailwind CSS**
- **TanStack React Query**
- **tRPC 11**
- **Express**
- **Drizzle ORM**
- **PostgreSQL / Supabase**
- **Vitest**
- **pnpm 9.12**

---

## Local development

### Prerequisites

- Node.js compatible with the current Expo/toolchain
- `pnpm` 9.12.x
- Required environment variables from `.env.example`

### Install

```bash
git clone https://github.com/lets-colab/LastBenchBd.git
cd LastBenchBd
pnpm install
```

Copy the environment template and supply your own local values:

```bash
cp .env.example .env
```

Never commit real credentials.

### Run the app + API together

```bash
pnpm dev
```

Useful alternatives:

```bash
pnpm dev:server
pnpm dev:metro
pnpm android
pnpm ios
```

---

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run API and Expo web development processes together |
| `pnpm check` | TypeScript check without emitting files |
| `pnpm lint` | ESLint across application, server, shared code, tests and scripts |
| `pnpm test` | Run Vitest test suite |
| `pnpm build` | Build the production API bundle into `server-dist/` |
| `pnpm build:web` | Assemble the local combined web site into `dist/` |
| `pnpm build:web:production` | Validate public environment values and build the production web artifact |
| `pnpm db:push` | Generate + migrate database changes — **do not point this blindly at production** |
| `pnpm qr` | Generate a project QR code |

---

## Deployment model

The intended production topology is deliberately simple:

| Layer | Platform | Contract |
| --- | --- | --- |
| Marketing + web app | **Netlify** | `/` = landing, `/app` = student app |
| API | **Render** | Express/tRPC server |
| Database | **Supabase Postgres** | Product data |
| Canonical web domain | `www.lastbenchbd.com` | Netlify custom domain |
| Canonical API domain | `api.lastbenchbd.com` | Render custom domain |

Netlify is the only supported web deployment for this repository. Render is the only supported API runtime.

### Production is not considered released until all of these pass

- Required `EXPO_PUBLIC_*` variables are configured in Netlify
- Required server variables are configured in Render
- The reviewed AI-guide database migration is applied to the live database
- `www.lastbenchbd.com` is attached to Netlify with correct DNS
- `api.lastbenchbd.com` is attached to Render with correct DNS
- API health endpoint succeeds
- Landing page succeeds
- `/app/` succeeds
- Fresh-browser login and logout succeed
- Returning session succeeds
- At least one real authenticated API request succeeds
- One real lead submission is received and follow-up is verified

A successful CI run or static deploy alone is **not** proof that the production product is live.

---

## Verification before merging or releasing

Run:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm lint
pnpm test
pnpm audit --prod --audit-level critical
pnpm build
pnpm build:web
```

For the actual production web path, use:

```bash
pnpm build:web:production
```

That command intentionally requires valid public production configuration.

For post-deploy verification, follow the release procedure documented in [`AGENT.md`](./AGENT.md).

---

## Repository map

```text
.github/                 CI and repository automation
app/                     Expo Router product UI
assets/                  App and canonical branding assets
components/              Shared interface components
constants/               Shared constants
content/                 Product/content resources
design-system/           Design system
drizzle/                 Database migrations/schema
going?                    —
hooks/                    React hooks
landing/                  Marketing site
lib/                      Client/shared libraries
scripts/                  Build and validation utilities
server/                   API/backend
shared/                   Shared business logic
tests/                    Automated tests
AGENT.md                  Engineering/agent operating manual
AGENTS.md                 Additional agent instructions
PRODUCT.md                Product and brand definition
design.md                 Product design system and interaction rules
DESIGN_AUDIT_AND_REBUILD.md Design audit/rebuild record
MESSAGING_FEATURES.md     Messaging implementation documentation
todo.md                   Working backlog
```

> Note: the `going?` line above should not correspond to a repository folder. If you see it in a generated copy of this README, remove it. The canonical directory list is the repository itself.

---

## Brand guardrails

The repository already contains canonical brand assets under [`assets/branding/`](./assets/branding/). Treat approved logos and marks as source assets:

- Do not redraw or approximate the logo
- Do not recolor it outside approved variants
- Do not distort proportions
- Do not regenerate approved brand marks with AI
- Preserve the project’s cinematic, sincere and forward-moving visual direction

Current product palette documented in `PRODUCT.md`:

- Brand Green `#00C853`
- Charcoal `#111111`
- Warm White `#FAFAF8`
- Sage `#E6F2E9`
- Gray `#6B6F76`

---

## Engineering standards

- Use conventional commits: `feat:`, `fix:`, `docs:`, `build:`, etc.
- Never ship hardcoded demo numbers disguised as live data
- Prefer verified states over optimistic assumptions
- Keep database changes deliberate and reviewed
- Do not auto-create or auto-alter production tables during server startup
- New data-backed features should follow the full chain: schema → database helper → tRPC procedure → UI → tests
- Report known gaps instead of hiding them
- Treat authentication, documents, payments, commissions, student records and AI advice as high-trust surfaces

---

## Documentation hierarchy

When documents disagree, use this order:

1. **Current code + passing verification** — what actually exists
2. **`README.md`** — repository orientation and release contract
3. **`AGENT.md`** — engineering operating manual and detailed release procedure
4. **`PRODUCT.md` / `design.md`** — product and brand principles
5. **Feature-specific docs** — implementation detail
6. **`todo.md`** — backlog, not proof of completion

Some older internal documentation still references earlier repository naming. The active repository is **`lets-colab/LastBenchBd`**; update stale references when touching those files.

---

## Current release focus

Before adding more surface area, prioritize production trust:

1. Complete production Netlify + Render configuration
2. Apply and verify required database migrations
3. Verify same-site authentication end to end
4. Verify real lead capture and follow-up
5. Verify document/storage authorization before opening full upload flows
6. Triage remaining non-critical dependency advisories
7. Keep product data current and source-backed

---

## Related links

- Website: `https://www.lastbenchbd.com` *(canonical target; verify release status before describing it as live)*
- Repository: `https://github.com/lets-colab/LastBenchBd`

---

**Last Bench** — building a clearer path from Bangladesh to Malaysia, with transparency, capability and community at the center.

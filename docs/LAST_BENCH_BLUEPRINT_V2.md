# The Last Bench — Unified Product Blueprint v2

**Status:** Working source of truth  
**Updated:** 2026-09-06  
**Canonical public domain:** `https://www.lastbenchbd.com`  
**Canonical repository:** `lets-colab/LastBenchBd`

This document updates the June 2026 blueprint with the product, brand, design, and
operating evidence now present across the repository, Claude Design references,
the current `[CLASS(Λ)]` offer surfaces, and the co.lab Lovable project.

It does not convert proposals into facts. Every important statement below is marked by
its status so a future agent cannot accidentally publish an idea as a shipped promise.

## 1. Status Language

| Label       | Meaning                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| **LIVE**    | Verified in the current product or public site code                                                      |
| **BUILT**   | Implemented in the repository but still dependent on a production release gate or external configuration |
| **PLANNED** | Direction exists, but delivery details are not yet approved or shipped                                   |
| **BLOCKED** | Requires credentials, access, migration, legal/commercial approval, or another human decision            |
| **RETIRED** | Older direction that must not guide new work                                                             |

## 2. North Star

The Last Bench is a student accelerator for Bangladeshi students considering Malaysia.
It helps a student move from uncertainty to a visible next step before admission,
through application and settlement, and toward skills, community, and future-readiness.

The public promise is deliberately practical:

> We help Bangladeshi students study, settle, and succeed in Malaysia.

The preferred line is **“Your journey, our mission.”** The brand idea is pride and
forward motion: a student's starting point does not decide the benchmark they can set.

The Last Bench is not:

- a visa guarantee;
- an admission guarantee;
- a conventional commission-first consultancy;
- a collection of motivational content without operational value;
- a claim that every student must progress into `[CLASS(Λ)]` or co.lab.

## 3. One Ecosystem, Three Paths

```text
THE LAST BENCH — student-first umbrella and public front door
│
├── STUDY & SETTLE — guidance, applications, Malaysia preparation, community
│   └── /app/ — authenticated student product
│
├── [CLASS(Λ)] — practical talent development through shipped work
│   ├── /class-lambda/ — programme explanation and path selection
│   └── /class-a/ — current masterclass and venture-builder registration hub
│
└── co.lab — brand and business development for validated opportunities
    └── /colab/ — connected venture pathway and human contact
```

The intended progression is:

`discover → get guided → build ability → prove the work → shape what comes next`

This is a navigable pathway, not an automatic funnel. Each transition requires the
student's choice and, where appropriate, human review.

## 4. Canonical Information Architecture

| Route                       | Audience                                             | Primary job                                                                         | Primary action              | Status                                          |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------- |
| `/`                         | Prospective students and parents                     | Build trust, explain the Malaysia journey, and reveal the next practical step       | Request mentor guidance     | **LIVE / BUILT**                                |
| `/app/`                     | Students with or creating an account                 | Show real progress, applications, university exploration, AI guidance, and settings | Continue the next real task | **BUILT**                                       |
| `/class-lambda/`            | Students and young builders seeking practical skills | Explain the learning philosophy and route people to the current offer               | Choose a path               | **BUILT**                                       |
| `/class-a/`                 | Prospective `[CLASS(Λ)]` learners                    | Compare the free Class 0 masterclass with the full venture-builder path             | Choose a class              | **BUILT**                                       |
| `/class-a/masterclass.html` | AI beginners and curious builders                    | Explain and register for the free Class 0 masterclass                               | Reserve a free seat         | **BUILT; DELIVERY REQUIRES HUMAN CONFIRMATION** |
| `/class-a/course.html`      | Learners ready for the full path                     | Explain and register interest for the 20-class venture builder                      | Apply for a seat            | **BUILT; PAYMENT SEPARATE**                     |
| `/colab/`                   | Founders, teams, partners, and validated talent      | Explain the connected venture pathway and start human scoping                       | Discuss a project           | **BUILT**                                       |
| `/thanks.html`              | Submitted lead                                       | Confirm receipt and set an honest expectation                                       | Return or open dashboard    | **BUILT**                                       |

Do not create another public homepage, app subdomain, GitHub Pages copy, or competing
brand shell. The supported public topology is one Netlify site with the landing at `/`
and the Expo web product at `/app/`.

## 5. Core Student Journey

### 5.1 Public journey — **LIVE / BUILT**

1. A student enters through a cinematic Dhaka-to-Kuala Lumpur narrative.
2. The environment moves from monsoon and night through dawn into daylight.
3. The story explains visible application stages and responsible university exploration.
4. The student chooses one of two honest actions:
   - request mentor guidance through the public contact form; or
   - open the student dashboard to sign in or create an account.
5. The footer reveals the wider ecosystem only after the primary student story.

### 5.2 Account journey — **BUILT**

1. Authenticate through the currently configured OAuth flow.
2. Complete a real student profile and onboarding state.
3. See real application data or a clear empty state.
4. Explore the stable Malaysia university directory without prediction theater.
5. Ask one of three AI guides, with explicit AI and verification boundaries.
6. Use profile settings, including a persistent day/night preference.

### 5.3 Production truth contract

- The mentor form is lead capture. It does not create an account.
- `/app/` is the account entry point in the current repository.
- A signed-out, empty, or unavailable state must be labeled honestly.
- No illustrative student name, percentage, deadline, offer, or activity may appear as
  if it belongs to the signed-in user.
- AI answers cannot guarantee admission, visa approval, employment, or immigration.

## 6. `[CLASS(Λ)]` — Talent Pathway

**Pronunciation:** “Class Lambda”  
**Status:** Public offer and registration surfaces are **BUILT**; dates, intake, and
delivery capacity still require human confirmation.

`[CLASS(Λ)]` is the Last Bench talent wing. Its purpose is to turn practical learning
into visible evidence of ability, not to sell attendance as transformation.

### Working learning loop

Every session should move through:

`Hook → Learn → Build → Battle-test → Ship`

### Current public paths

| Path                                | Current public contract                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Free Masterclass · Class 0          | A free practical introduction to the one-person AI team model; no payment is collected                                    |
| 20-Class One-Person Venture Builder | A proof-of-work course currently listed at **৳5,000**; the form captures an application and payment is handled separately |

The pages do not hardcode event dates. Registration does not guarantee a confirmed
schedule, delivery place, or outcome; the team must follow up with the operational
details.

### Programme arc

| Phase    | Intended outcome                                                                |
| -------- | ------------------------------------------------------------------------------- |
| Learn    | AI-native foundations, research discipline, positioning, content, and attention |
| Build    | Turn knowledge into artifacts, a portfolio, and a clearly framed offer          |
| Validate | Put the work in front of real people and revise from evidence                   |
| Launch   | Present proof, run a real value-creation attempt, and show what happens next    |

Potential operating components include a field guide, build log, prompt library, peer
squad, mentor feedback, pass gates, and a Demo Day. These remain **PLANNED** until their
delivery artifacts are present.

Earlier planning discussed a three-month, 30-class founding programme and a small
cohort. That version is **RETIRED** and must not override the current 20-class offer.
Do not publish dates, seat count, teacher ratio, certification, guaranteed outcomes, or
other operational promises until the owner confirms them and the delivery materials
exist.

Graduation should ultimately be based on evidence of work rather than attendance.
Strong students may be considered for a co.lab pathway, but no transition is automatic.

## 7. co.lab — Venture Pathway

**Status:** Connected brand/business direction is **VERIFIED**; each engagement remains
human-scoped.

co.lab is the business brand connected to The Last Bench. The GitHub account remains
`lets-colab`; the public brand is written **co.lab**.

The current positioning recovered from the Lovable project is brand and business
development built around **Collaboration · Connection · Community**. Relevant capability
areas are:

- positioning and brand systems;
- product and customer experience;
- practical growth operations and experiments;
- converting validated talent or ideas into scoped work.

Do not import unverified international-client counts, growth percentages, delivery
timelines, case studies, or performance claims from old marketing copy. A project begins
only after scope, owner, evidence, price, approval, and delivery terms are agreed.

## 8. Founders and AI-Guide Boundary

The current product and Claude Design reference identify three real founders and focus
areas:

| Person        | Verified product focus                                                   |
| ------------- | ------------------------------------------------------------------------ |
| Sayem Ahmed   | Founder & CEO; main student journey and operating direction              |
| Fahim Shahbaz | Co-founder; university exploration, matching logic, and career direction |
| Erfan Uddin   | Co-founder; community, talent development, and ecosystem/co.lab bridge   |

The app contains AI guides based on these focus areas. Required disclosure:

> AI perspectives are based on the founders' focus areas. They are not the founders and
> can be wrong. Verify important decisions with current official sources and a human.

Only Erfan's approved public professional links were recovered from the co.lab source.
The earlier founder-card task did not contain complete approved profiles for all three.
Therefore:

- publish role-led text only for now;
- do not invent biographies, credentials, achievements, quotes, or portraits;
- add photography and extended biographies only after all three founders approve them.

## 9. Signup, Lead, and Data Boundaries

### Current entry points

| Entry                    | What it does                                                  | What it does not do                                            |
| ------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Landing mentor form      | Sends consented contact details to Netlify Forms              | Create an app account or promise a response time               |
| `/app/` auth             | Starts the current account flow                               | Enroll a user in `[CLASS(Λ)]` or co.lab                        |
| Free masterclass form    | Captures a consented Class 0 registration                     | Take payment or confirm an unpublished event date              |
| Full-course form         | Captures a consented application for the listed 20-class path | Take payment, guarantee a seat, or confirm an unpublished date |
| co.lab WhatsApp/Calendly | Opens a conversation                                          | Create a contract or authorize delivery                        |

The previously mentioned Replit signup could not be identified in the current repo,
local project folders, or recoverable project history. It must remain disconnected until
the exact URL/export, ownership, data destination, privacy language, and live behavior
are verified.

### Data minimization

- Public forms may ask only for information needed to route the first conversation.
- Do not request identity documents, bank details, credentials, immigration records, or
  sensitive academic files through a public lead form.
- Documents belong in an authenticated upload flow after the missing picker UI and
  production storage path are verified.

## 10. Design System Contract

### Fixed identity

- Brand Green: `#00C853`
- Green on dark: `#00E676`
- Charcoal: `#111111`
- Warm White: `#FAFAF8`
- Sage: `#E6F2E9`
- Gray: `#6B6F76`
- Soft Gray: `#A1A1AA`
- Marketing: Anton + Space Grotesk
- Product UI: General Sans + Sora
- Visual law: dark for emotion, white for trust, green for progress

### Surface behavior

- Landing: cinematic, seasonal, spatial, and emotionally paced.
- App: quiet, fast, readable, one-handed, and data-led.
- `[CLASS(Λ)]`: editorial rhythm and visible progression without “course platform” cliché.
- co.lab: confident dark surfaces and restrained green cues without importing a separate
  neon/SaaS identity.

### Claude Design synthesis

The three live project files are useful in different ways:

| File                   | Keep                                                          | Reject or constrain                                                                |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Malaysia Experience v2 | Seasonal motion, depth, destination feeling, cinematic pacing | Heavy 3D or footage that harms mobile performance, accessibility, or conversion    |
| Last Bench Dashboard   | Clear hierarchy, progress visibility, concise cards           | Demo student identity, fake progress, fake deadlines, and scripted “live” activity |
| Last Bench Mobile App  | Compact navigation, mobile density, focus on next action      | Static prototype state replacing real auth/data/error behavior                     |

All primary actions need a minimum 44px target. Essential text must remain readable at
320px. The complete journey must work with reduced motion and without device tilt.

## 11. What Is Built vs. Incomplete

### Built in the repository

- cinematic public student journey with the rain/night/dawn/day arc;
- mobile student dashboard wired to real queries and honest empty/error states;
- applications, university exploration, three AI-guide surfaces, onboarding, profile,
  and light/dark preference;
- tutor, messaging, cohort, admin, notification, referral, and payout foundations;
- Netlify assembly of landing and `/app/` into one site;
- Render server bundle and Supabase-backed data architecture;
- `[CLASS(Λ)]` overview, class-choice hub, two consented registration forms, and co.lab public route.

### Incomplete or blocked

1. Production auth/API/custom-domain release gate has not been proven in this blueprint.
2. The AI-guide database migration requires deliberate production application.
3. Document upload backend exists, but the product lacks a complete file-picker UI.
4. Netlify leads are not yet connected to the application database or an approved CRM.
5. Social login is not implemented.
6. Complete approved founder profiles and all three photographs are unavailable.
7. The Replit signup artifact remains unidentified.
8. `[CLASS(Λ)]` dates, intake, detailed lesson plans, and operating capacity require
   founder approval and production work; the current published course price is ৳5,000.
9. GitHub currently triggers previews for both `lastbenchbdd` and legacy `exitbd`, plus
   a Cloudflare Workers build. DNS confirms `www.lastbenchbd.com` uses
   `lastbenchbdd.netlify.app`; retire duplicate integrations only after checking their
   forms, domains, and required history.

## 12. Release Contract

The canonical web release is complete only when all of the following pass:

1. Typecheck, lint, tests, production audit, server build, and web build.
2. The Netlify site serves `/`, `/app/`, `/class-lambda/`, `/class-a/`, and `/colab/` correctly.
3. The Render health endpoint returns API content, not an HTML fallback.
4. The fresh-browser auth callback returns to `https://www.lastbenchbd.com/app/`.
5. One real authenticated query succeeds.
6. Mentor, free-masterclass, and full-course forms appear in the correct Netlify Forms destination.
7. All primary links and forms pass 320px, 390px, and 430px mobile QA.
8. No map/mirror panel, fake student data, false metric, or hidden demo fallback appears.

Infrastructure values and DNS remain human-controlled. A passing local build or GitHub
check does not prove the canonical domain is live.

## 13. Decision Authority

AI agents may inspect, implement, test, document, and prepare a review branch. Human
approval is required for:

- money, price, payment, commission, and commercial terms;
- production credentials, domain ownership, database migrations, and private access;
- legal, privacy, immigration, or regulatory statements;
- founder biographies and portraits;
- partnerships, performance claims, and final publication/merge.

## 14. Evidence Reviewed for v2

- current Last Bench repository, application code, server contract, and brand kit;
- Claude Design project `LASTBENCH 3D`: Malaysia Experience v2, Last Bench Dashboard,
  and Last Bench Mobile App;
- June 2026 Last Bench blueprint PDFs (strategic source, visually and factually dated);
- `[CLASS(Λ)]` planning record and product-architecture notes;
- private Lovable source repository `lets-colab/letscolab`;
- current canonical GitHub repository `lets-colab/LastBenchBd`.

Where sources disagree, current working code and verified operating reality take
precedence over mockups, old PDFs, and aspirational marketing copy.

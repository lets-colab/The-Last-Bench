# Product

## Register

brand

## Users

Bangladeshi secondary-school students (and their parents) considering studying in Malaysia, plus the tutors and mentors who guide them. They arrive skeptical of agencies, on mid-range Android phones and patchy connections, looking for someone who treats their future as more than a commission.

## Product Purpose

The Last Bench guides Bangladeshi students from confusion to clarity — admissions, visas, scholarships, and a community that lasts. The landing site's job: make a student feel the journey from Dhaka to Kuala Lumpur is real and within reach, then start it (sign up / join the community).

## Brand Personality

Cinematic, sincere, determined. "From the last bench. To the world." — the underdog who refuses to be defined by where they started. Dark night-sky drama carried by Brand Green progress. Never corporate-slick, never charity-pity; proud, forward-motion energy.

## Brand System (fixed — from the official kit)

- Brand Green #00C853 · Charcoal #111111 · Warm White #FAFAF8 · Sage #E6F2E9 · Gray #6B6F76
- Display: Anton (site) / General Sans (app). Body: Space Grotesk (site) / Sora (app).
- Logo: bench + rising arrow. Tagline: "Creating a Lasting Benchmark."
- Voice pattern: short declarative pairs with full-stop beats ("From Last Bench. To The World.")
- Visual law: dark for emotion, white for trust, green for progress.

## Anti-references

- Generic ed-agency sites: stock photos of smiling students, trust badges, WhatsApp button spam.
- SaaS landing clichés: hero metrics, identical card grids, purple gradients.
- Charity-pity framing of "last bench" students. The brand is pride, not sympathy.

## Product Architecture

Last Bench is the student-first umbrella and the only public front door. The connected
parts have distinct jobs and must not compete for attention on the main conversion path:

| Path | Job | Canonical route | Current status |
|---|---|---|---|
| Last Bench journey | Help a student understand the Malaysia pathway and request human guidance | `/` | Public marketing experience |
| Student dashboard | Authenticated profile, applications, university exploration, AI guidance, and account settings | `/app/` | Working product; production infrastructure still requires release-gate verification |
| `[CLASS(Λ)]` | Develop practical AI, content, brand, and validation ability through shipped work | `/class-lambda/` | Founding programme in development; interest only, not enrollment |
| co.lab | Shape validated talent, ideas, brands, product experiences, and growth operations | `/colab/` | Connected venture pathway; work starts only after human scoping |

The intended progression is:

`discover → get guided → build practical ability → prove the work → shape a venture`

This is a pathway, not a promise. Students may use only the guidance product, and entry
to `[CLASS(Λ)]` or co.lab is never implied by creating an account.

## Conversion Contracts

- The landing mentor form creates a lead in Netlify Forms. It does not create an account.
- `/app/` is the only account and authentication entry point currently wired in this repo.
- The `[CLASS(Λ)]` form registers interest only. It does not confirm admission, dates,
  pricing, payment, or a cohort seat.
- co.lab contact links begin a human conversation. They do not create a contract or
  authorize work.
- Do not connect an unknown Replit signup URL until its ownership, data destination,
  privacy terms, and current behavior have been verified.

## Product Truth Rules

- Never display illustrative dashboard progress, dates, offers, rankings, acceptance
  rates, visa odds, scholarships, or prices as if they belong to the signed-in student.
- Show real records, a clearly labeled empty state, or an explicit service-unavailable
  state. No silent demo fallback is allowed in production.
- AI guides are software shaped around the founders' focus areas. They are not the
  founders, and their output must be checked before a consequential decision.
- Dates, fees, eligibility, programmes, scholarships, and immigration guidance require
  a current authoritative source and visible review context.

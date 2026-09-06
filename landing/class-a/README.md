# CLASS[Λ] signup surfaces

Two conversion pages share one visual and interaction system:

- `masterclass.html` — free CLASS[Λ] Masterclass / Class 0 registration.
- `course.html` — paid 20-Class One-Person Venture Builder registration.

## Product rules

- No event dates are hardcoded into either page.
- Masterclass is clearly marked **FREE**.
- Full course is clearly marked **৳5,000**.
- Both pages use `ACQUIRE. APPLY. ADVANCE.` and the CLASS[Λ] one-person AI team positioning.
- Pages cross-link so the masterclass acts as the top-of-funnel entry and the full course is the conversion destination.
- Both forms are configured for Netlify Forms and include honeypot spam protection.
- Both forms require explicit contact consent and warn against submitting sensitive data.
- The course page registers interest only; payment is explicitly handled separately.
- The masterclass page does not request or imply payment.
- Every surface links back into the Last Bench ecosystem instead of behaving like a separate brand.

These files are copied automatically into the production web artifact by `scripts/build-site.mjs` because that build recursively copies `landing/` into `dist/`.

## Production routes after deployment

- `/class-a/masterclass.html`
- `/class-a/course.html`

Form names used by Netlify:

- `class-a-masterclass`
- `class-a-course`

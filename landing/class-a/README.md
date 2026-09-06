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
- Forms currently simulate registration locally in the browser. They do not claim backend persistence or payment processing.
- Before public launch, connect both forms to the approved registration/CRM system and replace the local-only success contract.

These files are copied automatically into the production web artifact by `scripts/build-site.mjs` because that build recursively copies `landing/` into `dist/`.
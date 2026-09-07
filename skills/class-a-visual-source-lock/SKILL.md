---
name: class-a-visual-source-lock
description: Mandatory visual-fidelity workflow for any CLASS[Λ] landing page, signup funnel, motion, Figma, Replit, or frontend change. Prevents source-of-truth drift and blocks publishing until the rendered implementation is visually checked against the approved cinematic reference.
---

# CLASS[Λ] Visual Source Lock

## Purpose

Prevent the exact failure mode where a later flat wireframe/Figma interpretation replaces the approved cinematic CLASS[Λ] direction.

This skill is mandatory for every change to CLASS[Λ] visual design, Figma frames, Replit implementation, landing pages, responsive layouts, 3D scenes, motion, registration UI, or production publishing.

## Canonical Creative Direction

The locked reference is the approved mobile cinematic concept previously supplied by the user. Its defining visual DNA is:

- Near-black cinematic canvas with an extremely subtle technical/grid texture.
- Large editorial, condensed-feeling white typography with strong negative space.
- Primary hero: `ONE PERSON. A FULL AI TEAM.`
- Brand lockup: `CLASS[Λ] · ACQUIRE. APPLY. ADVANCE.`
- Transformation signal: `AI BEGINNER → VENTURE-READY FOUNDER`.
- Floating dimensional `20` object: metallic/soft-plastic dark-silver 3D tile with realistic bevel, depth, highlight and shadow.
- Thin orbital rings beneath/around the floating object, implying an AI operating system rather than decorative circles.
- Controlled depth, camera perspective, glow, reflections and parallax; cinematic, not game-like.
- Registration CTA remains obvious and conversion-first, including the current course price when applicable.
- Mobile-first composition. Desktop is an expansion of the same visual language, never a separate flat redesign.

## Source Priority

When sources disagree, use this order:

1. The latest explicit user instruction.
2. The approved cinematic CLASS[Λ] reference described above.
3. Explicitly approved later screenshots/concepts.
4. Figma structure and content.
5. Existing implementation/code.

A later Figma frame does **not** automatically outrank the cinematic reference. Figma can define structure, copy, fields and flow while the cinematic reference defines art direction.

If the original reference image is not available in the working context, do not invent a replacement. Ask for the reference or use an explicitly approved stored copy.

## Mandatory Skill Chain

Before changing CLASS[Λ], apply the relevant parts of this chain:

1. **Product Design / image-to-code or audit** — treat the approved reference as evidence, not inspiration.
2. **Figma design-to-code** — read the actual target frame when implementing Figma structure.
3. **Figma implement-motion** — preserve motion intent where Figma has motion; do not fabricate arbitrary animation.
4. **Build Web Apps / frontend-app-builder** — extract a real design system before implementation.
5. **Build Web Apps / frontend-testing-debugging** — validate the rendered app, not only the build.
6. **React best practices** — keep 3D/motion code performant and lazy/conditional where appropriate.
7. **Browser screenshot QA** — compare the live render against the approved reference at mobile and desktop sizes.
8. **Replit publish** only after the visual QA gate passes.

## Design-System Lock

### Palette

- Background: true near-black, not navy, purple, warm gray, or gradient-heavy.
- Foreground: off-white/white.
- Secondary text: neutral cool gray.
- Borders: subtle graphite.
- 3D object: neutral metallic/silver-gray with believable material response.
- No colorful accent system unless the user explicitly changes the brand direction.

### Typography

- Hero typography is the dominant graphic device.
- Preserve aggressive scale and intentional line breaks on mobile.
- Do not shrink the headline to make layout easier.
- Supporting copy must remain readable and materially quieter than the hero.

### Geometry

- Use open composition and negative space.
- Avoid turning the experience into a generic SaaS card grid.
- Cards/panels are functional containers, not the visual identity.
- The 3D `20` object and orbital system are signature hero assets.

### Motion

Motion must feel physical and restrained:

- slow floating/hover drift of the `20` object;
- very subtle orbital movement;
- small camera/parallax response where performant;
- staggered editorial text reveals;
- scroll-linked depth only when it remains smooth;
- CTA state changes that reinforce action.

Never use bouncy, playful, neon, particle-heavy, or template-style animation.

Honor `prefers-reduced-motion`. On low-power/mobile contexts, gracefully reduce or disable expensive 3D while preserving the same static visual composition.

## 3D Performance Gate

The site is a signup funnel, not a 3D demo. 3D must improve perceived quality without harming conversion.

- Keep the signature hero scene isolated and lightweight.
- Lazy-load heavy 3D dependencies/assets when possible.
- Avoid continuous high-cost effects below the fold.
- Avoid unnecessary post-processing.
- Provide a visually faithful non-WebGL/static fallback.
- Do not allow 3D to delay the first readable headline or CTA.

## Conversion Lock

The cinematic treatment must never obscure the offer.

For the full course, preserve:

- `20 CLASSES. ONE PERSON. A FULL AI TEAM.` or the currently approved equivalent.
- `AI BEGINNER → VENTURE-READY FOUNDER`.
- course price when currently approved.
- clear registration CTA.
- proof-of-work / venture-ready outcome language.

For the free masterclass, preserve:

- explicit `FREE` positioning;
- no-payment requirement;
- a clear route into the full program.

Do not add dates unless the user explicitly supplies and approves dates.

## Quality Gates — Publishing Is Blocked Until All Pass

### Gate A — Reference fidelity

Compare the current render against the approved cinematic source. Check at minimum:

- hero line breaks and scale;
- visual hierarchy;
- 3D `20` object presence/material/placement;
- orbital depth treatment;
- background/grid character;
- spacing and negative space;
- CTA visibility;
- mobile composition;
- desktop continuation of the same art direction.

### Gate B — Motion fidelity

Verify motion is smooth, restrained, meaningful, and reduced-motion safe.

### Gate C — Functional funnel

Verify:

- CTA navigation works;
- form fields work;
- validation is clear;
- submit/loading/success/error states exist;
- no accidental payment collection on interest-only registration;
- masterclass remains free.

### Gate D — Accessibility

At minimum:

- readable contrast;
- keyboard-focus visibility;
- semantic controls;
- labels/accessible names for form fields;
- motion reduction support;
- tap targets appropriate for mobile.

### Gate E — Performance

Verify the first meaningful content appears without waiting for 3D; avoid unnecessary bundle cost and animation work.

## Ready/Published Language Rule

Never say CLASS[Λ] is `ready`, `finished`, `10.5/10`, or `faithfully implemented` merely because:

- a build succeeded;
- Replit reports publish success;
- Netlify/Vercel reports a ready deployment;
- Figma frames exist;
- the page returns HTTP 200.

Those statements are allowed only after rendered visual QA against the source-of-truth reference plus the functional funnel checks above.

Deployment success means **live**, not **design-approved**.

## Failure Rules

- If the visual reference is unavailable: stop before creative reinterpretation.
- If browser/screenshot QA is unavailable: do not claim visual fidelity; state the verification gap.
- If Figma conflicts with the reference: preserve Figma's product structure but restore the cinematic art direction unless the user explicitly approved the Figma visual change.
- If performance forces simplification: simplify animation complexity, not the core composition or brand identity.
- If uncertain: preserve the locked reference rather than introducing a new design direction.

## Definition of Done

CLASS[Λ] is done only when the implementation is simultaneously:

1. recognizably the same cinematic system as the approved reference;
2. faithful to current Figma content/flow;
3. functional as a registration funnel;
4. responsive on mobile and desktop;
5. reduced-motion accessible;
6. performant enough that the hero and CTA appear promptly;
7. visually inspected after implementation;
8. published only after those checks pass.

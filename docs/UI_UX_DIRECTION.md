# ClinSync UI/UX Direction

## Product experience goal

ClinSync must feel immediately calm, premium, clear and trustworthy—not like a generic admin template or a flashy consumer chatbot. The patient-facing kiosk should be warm and inviting; the doctor console should be information-dense without feeling cluttered. Motion should make the experience feel responsive and intentional, never slow down a patient or distract from medical content.

## Design principles

1. **One primary action per state.** Every screen should make the next step obvious.
2. **Warm, human and clinical.** Use confident typography, generous spacing, clean surfaces and a restrained accent palette. Avoid sterile all-white wireframes and avoid neon/futuristic overload.
3. **Delight at the edges, clarity in the center.** The welcome experience and transitions can feel special; consent, identity confirmation, safety escalation, source conflicts and booking must be plain and unambiguous.
4. **The kiosk is touch-first.** Use generous touch targets, simple choices, short questions, visible progress and a persistent way to request help or switch to typing.
5. **Doctor workflows are fast.** Show the chief complaint and important context immediately. Use progressive disclosure for source detail, long histories and technical metadata.
6. **Trust is visible.** Label reported, extracted-unverified, historical, clinician-confirmed, uncertain and conflicting facts distinctly. Provide source links where supported.
7. **Accessibility is part of polish.** High contrast, readable sizing, visible focus, keyboard support, screen-reader semantics, no color-only status and reduced-motion support are required.
8. **Responsive by intent.** Optimize the kiosk for the target tablet orientation agreed by the team, then support a clinician workstation viewport. Do not simply stretch a desktop dashboard into a kiosk.

## Suggested visual direction

- **Base:** warm near-white / very light neutral background with white surfaces.
- **Typography:** crisp, modern sans-serif; a strong headline hierarchy for the kiosk and compact, legible hierarchy for the doctor console. Prefer a single well-supported font family unless a second font adds clear value.
- **Primary ink:** deep navy/charcoal for readable text and navigation.
- **Primary accent:** restrained teal/blue-green for active progress and trusted actions.
- **Secondary accent:** subtle cool indigo/lilac for ambient detail, not for urgent or clinical status.
- **Semantic colors:** dedicated accessible success, warning, error and neutral tokens; pair every color with text/icon labels.
- **Surfaces:** fine borders, soft elevation and selective translucency. Do not put every item in a floating card; use alignment, whitespace, dividers and typography to create hierarchy.
- **Background effects:** subtle ambient gradient or low-contrast abstract shapes are acceptable on welcome/idle states only. Never reduce text contrast or mask a safety message.

Treat these as design tokens to validate, not immutable brand colors. Define tokens in the frontend design system and avoid scattered one-off hex values.

## Signature interaction moments

### 1. Welcome / kiosk idle

A strong greeting, language choice, a clear start action, a privacy/consent explanation and a calm animated visual. Do not expose names or health details while identity is unconfirmed.

### 2. Identity confirmation

Show a minimal candidate-confirmation experience, never a patient record preview. Provide a clear “not me” and staff/manual registration route. Explain why the identity check is needed in plain language.

### 3. Conversational intake

Display one short question at a time, a subtle listening/processing state, editable transcript, confirmation when speech was unclear and a text-entry fallback. Do not make the person feel they are being examined by a surveillance tool. Do not infer medical seriousness from pitch or facial affect.

### 4. Document scan and extraction

Show the selected document, progress, extraction status and the ability to correct/flag fields. Distinguish “document uploaded” from “facts successfully extracted.” Make parse failure recoverable.

### 5. Context Ledger and Patient Context Diff

Use a scannable timeline and a consistent status vocabulary: `new`, `changed`, `historical`, `reported`, `extracted-unverified`, `doctor-confirmed`, `uncertain`, `conflicting`. Source details open in a drawer or split panel without losing the user's place.

### 6. Scheduling and escalation

Keep appointment choices simple and honest. Show real seeded availability from the backend, not fabricated times. Any escalated state must be unambiguous and must not be visually presented as routine appointment booking.

### 7. Doctor brief

Make the key summary scannable: chief complaint, relevant prior context, current medications/allergies if known, document findings, unresolved questions, conflicts, source links and routing rationale. The 60-second spoken summary is optional; the source-linked text remains primary.

## Motion and animation policy

- Prefer CSS transitions for simple hover/focus/opacity changes and Motion for React (`motion/react`) for page/step transitions, presence, shared-element and layout changes.
- Use consistent timing and easing. Motion should be quick enough not to impede task completion; do not animate every control or every piece of content.
- Animate only meaningful state changes: welcome to intake, question-to-question, extraction progress, opening evidence details, booking confirmation, queue updates.
- Provide stable loading states instead of indefinite shimmer. Respect `prefers-reduced-motion` and support lower-motion mode.
- Avoid scroll-jacking, parallax in clinical workflows, giant page transitions, confetti, auto-playing audio and looping motion that draws attention away from content.

## Should we use Three.js / React Three Fiber?

**Default decision: no 3D in the core workflow.** The product value depends on trust, speed and clarity; Three.js is not necessary to deliver that. CSS, SVG and Motion can make a voice/listening visual feel polished at much lower implementation and runtime cost.

A small optional 3D element may be considered for the kiosk welcome or listening state only if the completed interface already works and the visual improves comprehension or brand recognition. If selected:

- Isolate it in a small component owned by the frontend owner.
- Lazy-load it; never block startup, intake, document review, safety states, scheduling or the doctor console.
- Provide a CSS/SVG fallback for unsupported/slow WebGL and reduced-motion users.
- Keep rendering cost bounded; avoid large textures, many lights, high particle counts and continuous animation when idle.
- Test on the actual tablet/browser target and profile performance before merging.
- Treat it as a reversible enhancement; remove it if it causes lag, accessibility issues or distracts from the patient task.

Do not add R3F/Three.js simply because it looks impressive in a portfolio screenshot.

## Visual QA checklist

- [ ] Welcome screen has a clear focal point and one obvious primary action.
- [ ] No patient-specific data appears before server-confirmed identity.
- [ ] All screens work at agreed tablet dimensions and a standard desktop dimension.
- [ ] All touch targets are comfortable for touch use; keyboard and focus paths also work.
- [ ] Text contrast and status labels are accessible; color alone is never the cue.
- [ ] Loading, empty, error, retry, success and offline/unsupported states are considered.
- [ ] Voice can be skipped; typing is always available.
- [ ] Source drawer and page/step animations are smooth without layout jumps.
- [ ] Reduced-motion preference works.
- [ ] Long text, missing data, translated labels and small screens do not overflow.
- [ ] Screenshots are captured for the welcome, intake, document, Context Ledger, booking, doctor brief and at least one error state.
- [ ] No fake data, chart or animation is mistaken for live clinical information.


## Reference documentation

- Motion for React — animations and layout transitions: https://motion.dev/docs/react
- React Three Fiber — performance pitfalls: https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/pitfalls.mdx
- Three.js WebGL capability utilities and fallback support: https://threejs.org/docs/pages/WebGL.html

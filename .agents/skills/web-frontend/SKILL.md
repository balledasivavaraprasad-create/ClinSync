---
name: web-frontend
description: Use when building ClinSync's React/TypeScript patient kiosk, intake journey, document states, booking flow, doctor console or frontend API integration.
---

# Web Frontend Skill

## Read first

`AGENTS.md`, `docs/PRODUCT_BRIEF.md`, `docs/UI_UX_DIRECTION.md`, `docs/API_CONTRACTS.md`, `docs/TEAM_OWNERSHIP.md`, and `.agents/skills/design-system-motion/SKILL.md`.

## Owned paths

`apps/web/**` only, unless the Integration Captain explicitly creates a scoped handoff. Do not edit API contracts, backend, AI workflow, root configuration or another contributor's files.

## UX and implementation rules

- Build a tablet-first patient kiosk and an efficient doctor console as two intentional workflows, not one generic dashboard stretched across roles.
- Follow `docs/UI_UX_DIRECTION.md`; do not ship a default template look. Maintain tokens, consistent typography, whitespace, restrained color, reusable components and a coherent motion system.
- Prefer CSS/SVG and Motion for React for normal visual polish. Treat Three.js/React Three Fiber as optional and subject to the documented design decision gate.
- Use semantic components, typed props and a small, reusable component system. Avoid large all-in-one page components; keep state transitions explicit.
- Provide loading, error, empty, retry, success, offline/unavailable and confirmation states where applicable.
- Give the patient large touch-friendly actions, one clear question at a time, visible progress and accessible text-entry fallback for voice.
- Do not render patient history before the API confirms identity and authorization; hiding it in the UI is not a security control.
- Show source link/citation actions for ledger and brief claims, and preserve visible `uncertain` / `conflicting` labels.
- Do not use color as the only state indicator. Maintain contrast, focus, keyboard/screen reader paths and reduced-motion support.
- Never claim triage, diagnosis, live face recognition, real notifications or real availability if mocked.

## API integration

- Consume only `docs/API_CONTRACTS.md` and typed API client/schema.
- Avoid hard-coded patient/slot state outside explicit fixtures.
- Surface safe API error codes; do not show stack traces or raw model output.
- Never put secrets in client code or browser-exposed environment variables.
- Clear patient-specific state when identity is cancelled, a session resets or the kiosk returns to idle.

## Verification

Run available lint, type checks, tests and production build. Add flow/component tests for identity gate, intake transitions, source drawer, routing escalation state, booking conflict, session reset and API error behavior. Capture screenshots according to `.agents/skills/visual-qa/SKILL.md`. Report skipped tests honestly.

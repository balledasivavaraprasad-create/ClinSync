---
name: integration-release
description: Use when merging workstreams, running cross-stack smoke tests, managing CI, making a release candidate or rehearsing the demo.
---

# Integration and Release Skill

## Read first

`AGENTS.md`, `AUDIT.md`, `docs/TEAM_OWNERSHIP.md`, `docs/IMPLEMENTATION_ROADMAP.md`, `docs/QUALITY_GATES.md`, `docs/DEMO_SCRIPT.md`.

## Integration sequence

1. Merge shared contracts and minimal skeleton first.
2. Merge a smallest vertical slice from each workstream; keep `main` runnable.
3. Run unit tests and full cross-layer happy path after every meaningful merge.
4. Verify API request/response shape against contract. Reject mismatches rather than patching a hidden adapter in two places.
5. Run negative tests: identity unknown, model invalid, parse fails, escalation, slot unavailable, duplicate booking.
6. Verify telemetry and logs do not contain secrets or raw sensitive data.
7. Update `AUDIT.md` after merge and record test evidence/commit SHA.
8. Freeze features; accept only critical fixes after release-candidate decision.

## CI and release

- CI is evidence, not a substitute for local UX rehearsal.
- Keep checks fast and deterministic. Separate slow model evals if needed, but run a required smoke suite before demo.
- Do not use real provider keys in pull-request logs or fixtures.
- Record commit SHA, setup commands, seed/reset process and known limitations.
- Have a person who did not implement the whole journey perform the clean-checkout rehearsal.

## Demo honesty

Explicitly label mock face matching, seeded availability, model/provider fallback and synthetic policy scenarios. Never present a demonstration as clinically validated or production deployed.

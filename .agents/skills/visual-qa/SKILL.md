---
name: visual-qa
description: Use when reviewing frontend screenshots, responsive behavior, interaction polish, accessibility and visual consistency before integrating UI work.
---

# Visual QA Skill

## Read first

`docs/UI_UX_DIRECTION.md`, the relevant issue acceptance criteria, `AGENTS.md`, and the web frontend skill.

## Owned paths

Perform checks against `apps/web/**`. The web owner stores evidence in a unique `.agents/audit/visual/<ISSUE-ID>/` path. Do not edit other workstreams or the central `AUDIT.md`.

## Review protocol

- Run the app using documented commands and synthetic seed/demo state.
- Inspect the agreed tablet target and a standard desktop viewport; note actual viewport dimensions in the issue.
- Capture welcome/identity, intake, document processing, Context Ledger/diff, booking, doctor brief and one error state when those views exist.
- Look for clipping, overflow, inconsistent spacing, weak hierarchy, unreadable dense data, inconsistent tokens, unexpected layout jumps and small touch targets.
- Verify loading/empty/error/retry/success states, voice-to-text fallback, identity cancel/reset and booking conflict state.
- Check keyboard traversal, visible focus, labels/semantics, contrast and reduced-motion behavior.
- Verify no patient-specific content flashes before server-confirmed identity and that logout/reset clears screen state.
- If 3D exists, test a no-WebGL or fallback mode and reduced motion; it must not block functional flows.
- Report actionable defects with screenshot, viewport, reproduction path, expected behavior and severity.

Do not write “looks good” without evidence. Visual quality and clinical clarity must both pass.

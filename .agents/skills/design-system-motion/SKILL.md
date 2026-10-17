---
name: design-system-motion
description: Use when deciding ClinSync visual direction, design tokens, reusable interface patterns, transitions, animated voice states, or whether to use 3D.
---

# Design System and Motion Skill

## Read first

`docs/UI_UX_DIRECTION.md`, `AGENTS.md`, and the current components under `apps/web/**`.

## Ownership

This skill is guidance. The web owner is the routine editor of the design system under `apps/web/**` and `docs/UI_UX_DIRECTION.md`. Do not add dependencies or edit those files from another workstream without a handoff.

## Design execution

- Establish shared tokens for color, typography, spacing, radius, elevation, borders, focus, status and motion before adding many page-specific styles.
- Build a small coherent set of primitives and patterns: buttons, text fields, choices, progress, status labels, drawers, banners, upload states, source references and confirmation views.
- Give patient kiosk and doctor console distinct information density while preserving one brand system.
- Use Motion for React from `motion/react` for purposeful enter/exit, step and layout transitions; use CSS for small interactions. Avoid blanket animations on all elements.
- Make each animation communicate a state change. Prefer transform/opacity-based movement, short timings and interruption-safe transitions.
- Honor `prefers-reduced-motion`; stop ambient loops when the element is not active/visible.
- Avoid overusing glassmorphism, gradient text, floating cards, pills, giant rounded controls, neon glows and decorative charts. The interface must feel designed, not assembled from trends.

## 3D decision gate

Do not introduce Three.js/React Three Fiber by default. Propose a short decision note before adding it:
1. Which user moment benefits from the 3D visual?
2. Why can CSS/SVG/Motion not deliver the same benefit?
3. How is it lazy-loaded and isolated?
4. What is the fallback when WebGL is unavailable, reduced motion is requested or performance is poor?
5. What target-device result will be used to verify it?

Limit any approved scene to a non-blocking welcome/listening visual. Never put 3D between a user and consent, identity confirmation, intake answers, safety escalation, booking, source evidence or doctor decisions. Share geometries/materials where possible; avoid unnecessary per-frame React state updates and expensive mount/unmount loops.

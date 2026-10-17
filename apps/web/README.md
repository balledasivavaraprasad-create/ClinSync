# ClinSync Web Application (Patient Kiosk & Doctor Console)

Owner: **Teammate A**.
Relevant Skills:
- `.agents/skills/web-frontend/SKILL.md`
- `.agents/skills/design-system-motion/SKILL.md`
- `.agents/skills/visual-qa/SKILL.md`

Documentation:
- `docs/UI_UX_DIRECTION.md`
- `docs/API_CONTRACTS.md`
- `packages/contracts/openapi.json`

## Overview
The ClinSync frontend is a React + TypeScript + Vite web application engineered specifically for hospital tablet kiosks and doctor workstation consoles.

## Architecture & Directory Layout
```text
apps/web/
├── public/                     # Static assets, synthetic sample icons, favicon
└── src/
    ├── app/                    # Application root, provider composition, error boundaries
    ├── routes/                 # Top-level page routes (kiosk, doctor console, admin)
    ├── layouts/                # Tablet kiosk layout, clinician workstation layout
    ├── components/
    │   ├── ui/                 # Atomic design tokens & primitive UI components
    │   └── shared/             # Composite shared widgets (headers, navigation, modals)
    ├── features/
    │   ├── authentication/     # Staff/doctor login and session state
    │   ├── hospital-dashboard/ # Overview of hospital intake and department status
    │   ├── patient-kiosk/      # Welcome screen, language selector, greeting
    │   ├── patient-registration/# Non-biometric manual registration fallback
    │   ├── patient-intake/     # Voice-first conversational intake with mic states
    │   ├── documents/          # Document upload, photo capture, extraction progress
    │   ├── patient-context/    # Clinical Context Ledger & Patient Context Diff views
    │   ├── appointments/       # Department slot selection & booking confirmation
    │   ├── doctor-dashboard/   # Triage queue, pending brief reviews
    │   └── doctor-brief/       # Sourced brief presentation and audio player
    ├── design-system/          # Color tokens, typography, surfaces, spacing
    ├── animations/             # Motion for React variants (reduced-motion compliant)
    ├── hooks/                  # Audio recording, speech synthesis, responsive hooks
    ├── lib/
    │   ├── api/                # Typed API client based on packages/contracts/openapi.json
    │   ├── validation/         # Input validators and form schemas
    │   └── configuration/      # App configuration and environment variable access
    ├── styles/                 # Global styles, Tailwind or CSS custom properties
    └── test/                   # Component and interaction tests
```

## Key Engineering Rules
1. **Design Quality**: Confident, calm, clinical aesthetic. No generic unstyled dashboard. Follow `docs/UI_UX_DIRECTION.md`.
2. **Motion Over 3D**: Use Motion for React (`motion/react`) for deliberate transitions and audio listening states. Three.js is optional and strictly isolated.
3. **Accessibility**: Full touch targets (minimum 48x48px on tablet), visible focus rings, ARIA labels, and `prefers-reduced-motion` support.
4. **No Direct Backend/Model Keys**: The frontend never holds `GEMINI_API_KEY` or `GROQ_API_KEY`. All requests pass through `/api/v1`.
5. **Contract Conformance**: All API payloads must adhere to `packages/contracts/openapi.json`.

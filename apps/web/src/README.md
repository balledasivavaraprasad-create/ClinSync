# Web Application Source Directory

This directory contains the source code for the ClinSync tablet kiosk and doctor workstation web application.

## Directory Responsibilities
- `app/`: Application entry, root component, context providers, and error boundaries.
- `routes/`: Page-level route components mapped to URL paths.
- `layouts/`: Screen layout wrappers (e.g., KioskLayout, DoctorConsoleLayout).
- `components/ui/`: Atomic UI primitives (Button, Card, Badge, Dialog, Input, Slider).
- `components/shared/`: Reusable composite components (TopBar, BottomNavigation, StepIndicator).
- `features/`: Domain-specific feature modules containing view components, state, and hooks:
  - `authentication/`: Staff and doctor credentials and session management.
  - `hospital-dashboard/`: Intake status board and department summary.
  - `patient-kiosk/`: Kiosk standby, language choice, biometric candidate prompt.
  - `patient-registration/`: Fallback demographic entry for unindexed patients.
  - `patient-intake/`: Voice-driven intake interview with conversational state.
  - `documents/`: File upload, camera capture, and extraction progress viewer.
  - `patient-context/`: Visual Clinical Context Ledger and Patient Context Diff.
  - `appointments/`: Doctor slot picker and booking confirmation.
  - `doctor-dashboard/`: Doctor review queue, pending intakes, alert markers.
  - `doctor-brief/`: Synthesized brief reader, citations drawer, audio player.
- `design-system/`: Design tokens, colors, typography scales, elevation, spacing.
- `animations/`: Motion for React animation variants, transition presets, reduced-motion hooks.
- `hooks/`: Audio recording, speech synthesis, media query, and tablet-interaction hooks.
- `lib/api/`: Typed API client consuming `packages/contracts/openapi.json`.
- `lib/validation/`: Form validation and schema checkers.
- `lib/configuration/`: Application configuration constants.
- `styles/`: Global stylesheets and CSS variable tokens.
- `test/`: Unit and integration test suites for web components.

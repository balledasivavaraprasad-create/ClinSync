# TASK ID: TASK-P1-401
- **Owner**: person-1 (Frontend / Product Experience)
- **Branch**: `feat/p1-401-appointment-ui`
- **Workstream**: Frontend & Product Experience (`apps/web/**`)
- **Status**: IMPLEMENTED / VERIFIED

## Goal and Acceptance Criteria
- [x] Specialty/slot selection and confirmation states built using frozen canonical OpenAPI schema.
- [x] Render only available slots returned by backend; handle unavailable, stale and conflicting slots.
- [x] Handle escalation/review states distinctly from routine booking, without implying that the UI is making a clinical judgment.
- [x] Show success only after confirmed persisted booking from the API (no invented slot or fake booking success).
- [x] Test keyboard/touch interactions, slow API, retry, stale slot and booking conflict states.
- [x] Responsive tablet-first accessible interaction (touch target >= 44px, radiogroup/radio roles, clear keyboard focus).
- [x] Seamless integration into Patient Kiosk flow (progressing from Intake Summary and Documents to Scheduling) and top-level navigation tab.
- [x] 23/23 unit and integration tests passing in `appointments.test.tsx` (93/93 passing across all 6 web test suites).

## Files Created / Modified
- `apps/web/src/features/appointments/SpecialtyRoutingBanner.tsx`
- `apps/web/src/features/appointments/SlotSelector.tsx`
- `apps/web/src/features/appointments/AppointmentBookingModal.tsx`
- `apps/web/src/features/appointments/BookingConfirmationCard.tsx`
- `apps/web/src/features/appointments/AppointmentSchedulingHub.tsx`
- `apps/web/src/features/appointments/index.ts`
- `apps/web/src/features/patient-intake/IntakeSummary.tsx`
- `apps/web/src/features/patient-kiosk/PatientKioskFlow.tsx`
- `apps/web/src/routes/index.tsx`
- `apps/web/src/lib/api/types.ts`
- `apps/web/src/lib/api/mockData.ts`
- `apps/web/src/lib/api/mockAdapter.ts`
- `apps/web/src/test/appointments.test.tsx`
- `.agents/audit/tasks/TASK-P1-401.md`

## Contracts & Dependencies
- Contracts Affected: None (strictly read-only consumer of `packages/contracts/openapi.json`)
- Dependencies Satisfied: `TASK-P1-201`, `TASK-P2-201` (merged on `main`)
- Parallel Work Allowed: Built and verified with typed mock adapter against frozen slot/booking contract; live API integration ready for `TASK-P2-401`.

## Verification & Test Results
- `npm --prefix apps/web test`: PASSED (93/93 passed across 6 test suites in 4.00s)
- `npm --prefix apps/web run lint`: PASSED (0 errors, 0 warnings)
- `npm --prefix apps/web run typecheck`: PASSED (0 errors)
- `npm --prefix apps/web run build`: PASSED (built in 2.15s)
- `npm run contracts:validate`: PASSED (15 endpoints, 25 schemas)
- `git diff --check apps/web`: PASSED (Clean whitespace, 0 formatting errors)

## Security & Safety Checks
- Redacted / Synthetic data only verified: YES
- No raw patient PII in traces: YES
- Clinical safety escalation gates routine booking: YES (URGENT_ESCALATION and HUMAN_REVIEW block self-booking)
- No credentials or secrets exposed to frontend: YES
- `.env.example` protected and untracked from commit: YES

## Next Dependency-Ready Task
- `TASK-P1-501` (Doctor Console and Briefing UI) — Phase 5 / Gate G5

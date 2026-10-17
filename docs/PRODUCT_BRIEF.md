# ClinSync Product Brief

## One-sentence vision

ClinSync is a hospital-controlled, voice-first patient intake and clinical handoff system that combines a patient's current account, relevant prior history and newly submitted documents into a source-linked brief for the doctor before the consultation.

## The product promise

Reduce repetitive history gathering and record hunting by presenting what is known, what is new, what conflicts, what remains uncertain and where the information came from—without automating diagnosis or replacing clinical judgment.

## Primary experience

1. A patient approaches the hospital tablet. The kiosk presents clear consent and language choices.
2. A face match, if demonstrated, proposes a candidate only. The patient confirms identity using a secondary check before any medical record is displayed. A non-biometric route remains available.
3. ClinSync greets the confirmed patient and starts a conversational intake, asking one relevant question at a time.
4. Answers become a validated encounter record. Missing and uncertain fields are tracked rather than guessed.
5. The patient or staff attaches a synthetic report. The document pipeline extracts candidate facts and preserves source/page evidence and processing status.
6. The Clinical Context Ledger combines relevant prior facts and new candidate facts while preserving provenance and contradictions.
7. A deterministic, clinician-approved demo policy decides whether to escalate for urgent human assessment or permit routine scheduling. This is not a medical diagnosis or validated triage product.
8. Routine cases are mapped to a department and an actual seeded slot. The backend transaction validates availability and prevents double booking.
9. The doctor console shows the new appointment, a concise source-linked brief, previous-versus-new context, unresolved conflicts and source documents. Audio is optional.
10. The doctor reviews, corrects and approves relevant notes. An audit event records who changed or approved what and when.

## Signature capabilities

1. **Clinical Context Ledger:** each fact carries its type/status, source, date, extraction method, confidence where meaningful and review state.
2. **Patient Context Diff:** separates new, changed, historical, missing, uncertain and conflicting context.
3. **Adaptive Intake:** one-question-at-a-time flow with explicit collected/missing/uncertain fields and bounded turns.
4. **Safety-Gated Routing:** deterministic and configurable escalation before routine appointment booking.
5. **Evidence-Backed Doctor Brief:** concise synthesis with claim-to-source references, not a free-floating paragraph.
6. **Replayable Evaluation Proof:** versioned synthetic golden scenarios with expected behavior, execution trace and regression outcome.

## MVP scope boundaries

- No real patient enrollment or real facial biometrics in the demo.
- No clinical diagnosis, autonomous treatment, medication dosing or unvalidated emergency triage.
- No production hospital deployment or live EHR integration in the initial prototype.
- No live SMS/email delivery, payment, insurance or broad hospital-management platform unless explicitly prioritized later.
- No multi-agent architecture for its own sake. Prefer one explicit, bounded workflow with specialized steps.
- No requirement to use 3D. Visual quality must come from coherent design, hierarchy, interaction quality and performance first.

## Success measures

Measure on synthetic test data; do not make claims about real-world clinical outcomes:

- correct identity gating behavior;
- extraction correctness against annotated sample documents;
- coverage of doctor-brief claims by valid source references;
- repeated or missed intake questions;
- correct routing for predefined demo scenarios;
- no double-booked slot under a concurrency test;
- malformed structured output handled by validation/fallback;
- completion rate through the demonstrated user journey;
- test suite and CI status;
- frontend performance, accessibility and visual QA findings.

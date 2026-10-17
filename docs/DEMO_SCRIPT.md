# ClinSync — Three-Minute Demo Script

Use synthetic names, documents, faces and appointments only. Label mocked features clearly.

## Scenario setup

Seed one returning synthetic patient with a prior consultation, one old report, one recorded medication and one explicitly unresolved historical field. Seed one new synthetic patient, two departments, one routine appointment slot, and one high-risk policy fixture. Do not use realistic real-patient data.

## Walkthrough

### 0:00–0:25 — Arrival and identity

The kiosk greets the user after language/consent selection. Demonstrate a candidate match without exposing history, then complete the synthetic secondary confirmation. Also briefly show the fallback when the match is uncertain.

### 0:25–1:05 — Adaptive intake

Patient describes a complaint. ClinSync asks one missing-information question, accepts a response, updates progress and avoids repeating an already-known field. Show a correction path if transcription is wrong.

### 1:05–1:35 — Document and context diff

Upload the synthetic report. Show processing status, extracted fact and source page. Open the Context Ledger and demonstrate that a historical fact, new extracted fact and unresolved conflict remain visibly distinct.

### 1:35–2:00 — Routing and booking

Show the routine seeded case mapped to a configured department and available slot. Book it and show the backend result. If time allows, attempt a duplicate booking and show the safe conflict response. Show the predefined high-risk fixture takes the configured escalation route and does not continue to ordinary booking.

### 2:00–2:35 — Doctor experience

Open doctor queue, new appointment, source-linked brief, previous-vs-new context diff and optional audio. Click a claim to show its underlying source.

### 2:35–3:00 — Engineering proof

Show CI passing and the golden evaluation summary. Open one trace for a model step with a validated schema and another for a bounded fallback. State exactly what is live, seeded or mocked.

## Avoid these demo mistakes

- Do not claim a medical diagnosis or real triage accuracy.
- Do not reveal patient history before identity confirmation.
- Do not claim face matching if it is a mock.
- Do not present seeded appointment data as a live hospital integration.
- Do not show API keys, real private data, hidden prompts containing secrets, or trace payloads with identifiers.
- If a feature fails, explain the tested fallback rather than improvising a claim that it works.

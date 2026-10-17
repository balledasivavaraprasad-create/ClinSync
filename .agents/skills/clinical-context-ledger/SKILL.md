---
name: clinical-context-ledger
description: Use when representing clinical facts, source provenance, current-vs-historical comparison, contradictions, approvals or clinician-ready summaries.
---

# Clinical Context Ledger Skill

## Core invariant

A generated clinical claim is not automatically a verified fact. Preserve its source, time and review status.

## Required fields

Each fact should carry a stable ID, concept, typed value/unit as applicable, clinical time if known, recorded time, fact type, status, source type/ID, source location where available, extraction method, optional confidence, review actor/time and relation to any superseded fact.

## Status distinctions

Use typed states such as `reported`, `extracted_unverified`, `historical_recorded`, `doctor_confirmed`, `uncertain`, `conflicting`, and `rejected`. Do not flatten these into one generic `fact` label.

## Rules

- Never invent a source pointer or confidence score.
- If a PDF extraction has no reliable page/section coordinate, say source document only; don't invent a page.
- A patient-reported statement is not equivalent to a doctor-confirmed finding.
- Preserve dates and units; don't silently convert or combine potentially incompatible measurements.
- Conflicts must remain visible until a designated human resolves them. Preserve both sources and an audit event.
- Context Diff should show new, changed, unchanged/relevant historical, uncertain, conflicting and absent information without implying absent information is negative.
- Every brief claim should link to one or more ledger facts. If a claim can't be supported, omit it or label it as a question/uncertainty.
- Doctor correction creates a traceable correction/version; never destructively erase the old audit record.
- SQL is the source of truth. Vector search and Mem0 are auxiliary; verify retrieved records against authorized source records.

## Checks

Tests must cover source attribution, wrong/missing source, conflicting medication facts, patient-reported versus confirmed status, stale/contradictory histories, and unsupported brief claims. Keep all fixtures synthetic.

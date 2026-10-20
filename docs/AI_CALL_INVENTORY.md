# ClinSync — AI Call Inventory & Purpose Audit

**Document Status:** ACTIVE & VERIFIED  
**Owner:** Teammate C (Agentic AI + RAG + Evaluations) & Principal AI Systems Engineer  
**Reference Requirement:** TELEMEDICON 2026 Evaluation Directive (Phase 2)  

---

## Executive Principle: Selective, Purposeful AI

As dictated by the jury and clinical safety mandates, **ClinSync behaves like a healthcare workflow product, not an AI demonstration gallery.** 
Every AI operation must justify:
1. Why deterministic code cannot solve the problem.
2. How the output is strictly validated and constrained.
3. How failure degrades gracefully without risking clinical safety or halting the patient journey.

Deterministic application code handles:
- Authentication & permission checks.
- SQL persistence & ACID slot booking.
- Acute red flag triage rules (`EMERGENCY_ESCALATION`).
- Input size & MIME type validation.
- Rate limiting and retry ceilings.

AI is used **only** for natural-language extraction, adaptive conversational questioning, multi-document summarization, and physician briefing narrative synthesis.

---

## Comprehensive AI Operations Inventory

### Operation 1: `intake.understand_and_extract`

* **User-Facing Purpose**: Converts free-form, conversational patient speech (transcripts or typed text) into structured clinical concepts (chief complaint, duration, progression, symptoms, medications, allergies) during kiosk intake.
* **Input**: 
  - `patient_statement`: Raw string of patient's utterance (e.g., "I've had a dry cough and chest tightness for 4 days, worsening at night.").
  - `prior_extracted_facts`: List of already validated `ClinicalFact` entities from earlier turns in the encounter.
* **Output Schema**: `IntakeTurnOutput` (Pydantic / Zod)
  ```json
  {
    "extracted_facts": [
      {
        "fact_type": "chief_complaint | symptom | medication | allergy | condition",
        "concept": "string",
        "value": "string",
        "certainty": "confirmed | suspected | refuted",
        "temporal_status": "current | historical"
      }
    ],
    "is_complete": "boolean"
  }
  ```
* **Model & Provider**: Primary: `gemini-3.8-flash` via `GeminiGenerationAdapter`. Secondary fallback: `qwen/qwen3.8-27b` via Groq (text-only) or offline rule-based extractor.
* **Why AI is Necessary**: Layman patients do not describe clinical problems in medical terminology. They ramble, negate symptoms ("not fever, but body ache"), and describe temporal progressions that cannot be reliably captured by regex or static keyword matching.
* **Estimated Latency & Cost**:
  - Latency: 600ms – 1,200ms per turn.
  - Cost: ~$0.0001 per turn (~350 input tokens, ~120 output tokens).
* **Failure Behavior**: Graceful fallback to deterministic keyword/regex entity extractor (`OfflineFactExtractor`), preserving already extracted facts and allowing the patient to proceed.
* **Validation Method**: Strict schema enforcement via Pydantic model validation (`model_validate`). Entities violating allowlisted `fact_type` or `certainty` values are rejected.
* **Can it be Deterministic?**: Partially; a regex fallback exists for offline/error scenarios, but natural language nuances (negation, colloquial descriptions) require LLM understanding.
* **Can it Reuse Existing Result?**: Yes; prior turns are cached in the LangGraph encounter state and Mem0 memory harness, eliminating redundant extraction calls.

---

### Operation 2: `intake.follow_up_question`

* **User-Facing Purpose**: Generates a single, empathetic, highly focused clinical follow-up question acknowledging previously stated facts and filling missing diagnostic criteria (duration, severity, associated red flags).
* **Input**: 
  - `extracted_facts`: Accumulated facts in encounter.
  - `missing_concepts`: Missing slots in clinical checklist (onset, fever, radiation of pain).
  - `agent_memory_summary`: Context from Mem0 memory harness.
* **Output Schema**: `NextQuestionOutput`
  ```json
  {
    "next_question": "string (single sentence, non-diagnostic, plain language)"
  }
  ```
* **Model & Provider**: `gemini-3.8-flash` (or client-side deterministic question template matrix).
* **Why AI is Necessary**: Avoids robotic, repetitive questioning. Enables conversational flow that references specific prior complaints (e.g. "You mentioned chest tightness started 4 days ago; does the discomfort spread to your left arm or jaw?").
* **Estimated Latency & Cost**:
  - Latency: 500ms – 900ms.
  - Cost: ~$0.00008 per question.
* **Failure Behavior**: Falls back to deterministic clinical checklist templates indexed by chief complaint category.
* **Validation Method**: Output guardrail checks question length ($\le 160$ chars), enforces single-question constraint, and blocks clinical diagnosis or prescribing statements.
* **Can it be Deterministic?**: Yes. In fact, if the patient has completed 4 turns, turn 5 is deterministically forced to an intake summary confirmation.
* **Can it Reuse Existing Result?**: No (turn-specific), but capped at a maximum of 4 follow-up questions per encounter.

---

### Operation 3: `document.extract_facts`

* **User-Facing Purpose**: Extracts clinical facts, diagnostic findings, vital signs, and medication dosages from uploaded lab reports, discharge summaries, and referral letters.
* **Input**: 
  - Parsed text/markdown content per document page ($< 4,000$ characters).
  - `document_id`, `page_number`, `patient_id`, `encounter_id`.
* **Output Schema**: `DocumentExtractionOutput`
  ```json
  {
    "extracted_facts": [
      {
        "fact_type": "string",
        "concept": "string",
        "value": "string",
        "certainty": "confirmed | suspected | refuted",
        "page_number": 1,
        "char_offset_start": 120,
        "char_offset_end": 154,
        "verbatim_quote": "string"
      }
    ]
  }
  ```
* **Model & Provider**: `gemini-3.8-flash`.
* **Why AI is Necessary**: Clinical documents arrive in diverse, unstructured formats (unstructured consultation notes, varying lab panel layouts) requiring contextual semantic extraction and verbatim provenance linking.
* **Estimated Latency & Cost**:
  - Latency: 1,500ms – 3,500ms per page.
  - Cost: ~$0.0003 per page (~1,200 input tokens, ~300 output tokens).
* **Failure Behavior**: Documents marked as `STORED_UNPARSED` with error flag. The doctor is notified to inspect the original PDF/image directly in the console.
* **Validation Method**: Verbatim quote match verification: the extracted `verbatim_quote` is substring-checked against the raw page text before the fact is accepted into the Clinical Context Ledger.
* **Can it be Deterministic?**: No, due to layout diversity; however, OCR parsing and SHA-256 deduplication are strictly deterministic.
* **Can it Reuse Existing Result?**: **Yes (Critical Optimization)**. Results are cached by `sha256_checksum`. If the exact file was already processed, zero LLM calls are made.

---

### Operation 4: `routing.department_recommendation`

* **User-Facing Purpose**: Suggests the most appropriate outpatient department (e.g. Cardiology, Neurology, Pulmonology, Orthopedics) for routine clinic scheduling.
* **Input**: 
  - `chief_complaint`, `symptoms`, list of current `ClinicalFact` objects.
* **Output Schema**: `SpecialtyRoutingDecision`
  ```json
  {
    "recommended_department_id": "dept_cardiology | dept_neurology | dept_pulmonology | dept_orthopedics | dept_internal_med",
    "confidence_score": 0.94,
    "clinical_rationale": "string"
  }
  ```
* **Model & Provider**: Deterministic Rule Matrix **FIRST**; LLM fallback only when symptoms cross multiple specialties.
* **Why AI is Necessary**: Acts as an advisory candidate selector when ambiguous multi-system symptoms are presented (e.g. joint pain accompanied by facial rash).
* **Estimated Latency & Cost**:
  - Deterministic path: $< 5\text{ms}$, $\$0.00$.
  - AI advisory path: ~600ms, $\$0.0001$.
* **Failure Behavior**: Defaults safely to `dept_internal_med` (General Internal Medicine & Triage).
* **Validation Method**: Strict allowlist check: output department must exist in active hospital department catalog (`['dept_cardiology', 'dept_neurology', 'dept_pulmonology', 'dept_orthopedics', 'dept_internal_med']`). Any unauthorized department string is rejected.
* **Can it be Deterministic?**: **YES.** Over 80% of cases are resolved by deterministic rule evaluation in `_evaluate_deterministic_triage`. LLM is never called for acute symptoms (which route deterministically to `EMERGENCY_ESCALATION`).
* **Can it Reuse Existing Result?**: Yes; cached per encounter.

---

### Operation 5: `brief.synthesize_narrative`

* **User-Facing Purpose**: Synthesizes all gathered evidence (patient intake statements, previous EHR history, and uploaded document facts) into an executive 60-second structured brief for the physician.
* **Input**: 
  - Patient demographics & chief complaint.
  - Current encounter facts with source IDs.
  - Historical facts with previous timestamps.
  - Unresolved clinical conflicts (e.g. patient reports no medication, but 2025 consult note lists Metformin).
* **Output Schema**: `DoctorBriefData`
  ```json
  {
    "summary_text": "string (structured clinical narrative)",
    "citations": [
      {
        "citation_id": "CIT-01",
        "fact_id": "FACT-123",
        "source_type": "patient_statement | clinical_document | historical_ehr",
        "source_label": "[DOC-1, p.2]",
        "verbatim_quote": "string"
      }
    ],
    "unresolved_conflicts": ["string"],
    "missing_information": ["string"]
  }
  ```
* **Model & Provider**: `gemini-3.8-flash`.
* **Why AI is Necessary**: Consolidating 20–50 fragmented clinical data points into a fluent, cohesive, professional clinical handover narrative that doctors can digest in under 60 seconds is an ideal LLM synthesis task.
* **Estimated Latency & Cost**:
  - Latency: 1,800ms – 3,200ms.
  - Cost: ~$0.0005 per brief (~2,500 input tokens, ~600 output tokens).
* **Failure Behavior**: If model times out or errors, fallback synthesizes an itemized tabular brief directly from the verified database facts in the Clinical Context Ledger.
* **Validation Method**: Grounding evaluation: every citation in the brief must map to a genuine persisted fact in the database. Hallucinated citations are stripped or cause brief regeneration.
* **Can it be Deterministic?**: Narrative generation requires LLM; tabular fallback is 100% deterministic.
* **Can it Reuse Existing Result?**: Yes; generated once per encounter and cached. Doctor may request a refresh if new documents are attached.

---

### Operation 6: `brief.generate_audio` (Optional Audio Brief)

* **User-Facing Purpose**: Converts the synthesized doctor brief into a natural human voice audio briefing for the physician.
* **Input**: Validated `summary_text` string ($< 1,200$ characters).
* **Output**: Base64 encoded MP3 audio stream / audio blob.
* **Model & Provider**: ElevenLabs API (`eleven_turbo_v2_5` or `eleven_multilingual_v2`).
* **Why AI is Necessary**: High-fidelity text-to-speech with natural clinical cadence.
* **Estimated Latency & Cost**:
  - Latency: 2,500ms – 4,500ms.
  - Cost: ~$0.003 per generation.
* **Failure Behavior**: **Strictly Non-Blocking**. If ElevenLabs API key is absent, network fails, or quota is exceeded, `audio_status` is marked `AudioStatus.UNAVAILABLE` and the full text brief remains immediately readable.
* **Validation Method**: Audio header / content-length validation.
* **Can it be Deterministic?**: No.
* **Can it Reuse Existing Result?**: Yes; generated audio is cached on the encounter.

---

## AI Operations Summary & Cost/Latency Budget

| Operation Name | Frequency / Encounter | Provider | Avg Latency | Cost / Encounter | Deterministic Fallback Available? |
| :--- | :---: | :--- | :---: | :---: | :---: |
| `intake.understand_and_extract` | 2 – 4 calls | Gemini 3.8 Flash | 850 ms | $0.0003 | Yes (Regex / Offline Extractor) |
| `intake.follow_up_question` | 1 – 3 calls | Gemini 3.8 Flash | 650 ms | $0.0002 | Yes (Template Matrix) |
| `document.extract_facts` | 1 – 2 pages | Gemini 3.8 Flash | 2,200 ms | $0.0006 | Yes (Raw file attached for MD) |
| `routing.department_recommendation` | 0 – 1 call | Rule Engine + Gemini | 5 ms / 600 ms | $0.0000 | Yes (Rule matrix handles 80%+) |
| `brief.synthesize_narrative` | 1 call | Gemini 3.8 Flash | 2,400 ms | $0.0005 | Yes (Structured Ledger Table) |
| `brief.generate_audio` (Optional) | 0 – 1 call | ElevenLabs | 3,200 ms | $0.0030 | Yes (Silent text-only fallback) |
| **Total Pipeline (Full Encounter)** | **5 – 11 calls** | **Gemini + ElevenLabs** | **Pipelines Async** | **$\le \$0.0046$** | **100% Fallback Covered** |

# Evaluation Test Cases

Discrete evaluation cases specifying inputs, expected state transitions, expected extracted facts, and expected decisions.

## Test Case Format
Each case defines:
- `case_id`: Unique identifier (e.g., `CASE-ROUTINE-001`, `CASE-URGENT-002`)
- `patient_profile`: Synthetic baseline
- `intake_inputs`: Multi-turn synthetic user statements or documents
- `expected_facts`: Array of facts with source requirements
- `expected_decision`: `ROUTINE_SCHEDULING`, `HUMAN_REVIEW`, or `URGENT_ESCALATION`
- `expected_citations`: Required source IDs that must be referenced in doctor brief

# Evaluation Assertions

Core assertion functions and validators used by the eval runner:

1. `assert_schema_validity`: Validates output against Pydantic models.
2. `assert_groundedness`: Verifies that every clinical claim in the summary maps to a verified source in the Clinical Context Ledger.
3. `assert_no_fabricated_citations`: Fails if a citation ID does not exist in the source document catalog.
4. `assert_deterministic_escalation`: Fails if a red-flag symptom does not trigger `URGENT_ESCALATION`.
5. `assert_privacy_preserved`: Fails if sensitive IDs or unmasked strings appear in traces or logs.

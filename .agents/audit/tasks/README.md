# Task Handoff & Audit Records

Every contributor and Antigravity session records task execution notes and blockages here:
`.agents/audit/tasks/<TASK-ID>.md`

## Task Audit Format
```markdown
# TASK ID: <TASK-ID>
- **Owner**: person-1 | person-2 | person-3
- **Branch**: feat/...
- **Status**: READY | IN_PROGRESS | IMPLEMENTED | VERIFIED | BLOCKED

## Summary of Changes
- Detailed bullet points summarizing what was implemented.

## Files Created / Modified / Deleted
- Created:
- Modified:
- Deleted:

## Contracts & Dependencies
- Contracts Affected: None / <file>
- Dependencies Satisfied: <ID>
- Dependencies Still Blocked: <ID>

## Verification & Test Results
- Commands Run:
- Results:

## Security & Safety Checks
- Redacted / Synthetic data only verified: YES/NO
- No raw patient PII in traces: YES/NO

## Next Dependency-Ready Task
- <TASK-ID>
```

The central `AUDIT.md` is updated exclusively by Person 2 (Integration Captain) upon PR merge and integration validation.

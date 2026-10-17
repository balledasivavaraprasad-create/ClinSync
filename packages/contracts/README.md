# Shared contracts

This folder is owned by the Integration Captain. Put typed API schemas, shared enums, JSON schema fixtures or OpenAPI fragments here only after the corresponding contract is agreed in `docs/API_CONTRACTS.md`.

Do not independently duplicate types in frontend, API and AI code. When a cross-layer type changes, update its source schema and fixtures in one reviewed contract-change PR, then update each consumer.

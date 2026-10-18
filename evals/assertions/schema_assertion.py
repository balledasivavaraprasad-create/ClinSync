"""Assertion helper: Schema conformity and completeness."""

from typing import Any, Type
from pydantic import BaseModel, ValidationError


class SchemaAssertionResult(BaseModel):
    passed: bool
    name: str = "schema_conformity"
    details: str | None = None
    errors: list[str] = []


def assert_schema_conformity(output_data: Any, expected_schema: Type[BaseModel]) -> SchemaAssertionResult:
    """Assert that output_data validates cleanly against expected_schema."""
    try:
        if isinstance(output_data, expected_schema):
            return SchemaAssertionResult(passed=True, details="Output object already matches expected schema instance.")
        elif isinstance(output_data, dict):
            expected_schema.model_validate(output_data)
            return SchemaAssertionResult(passed=True, details="Dictionary validates against expected schema.")
        elif isinstance(output_data, str):
            expected_schema.model_validate_json(output_data)
            return SchemaAssertionResult(passed=True, details="JSON string validates against expected schema.")
        else:
            return SchemaAssertionResult(
                passed=False,
                errors=[f"Unsupported output type {type(output_data)} for schema validation."],
            )
    except ValidationError as val_err:
        errors = [f"{'.'.join(str(i) for i in e.get('loc', []))}: {e.get('msg')}" for e in val_err.errors()]
        return SchemaAssertionResult(passed=False, errors=errors, details="Pydantic validation failure.")
    except Exception as exc:
        return SchemaAssertionResult(passed=False, errors=[str(exc)], details="Unexpected exception during schema assertion.")


# Alias to match evals/assertions/README.md
assert_schema_validity = assert_schema_conformity

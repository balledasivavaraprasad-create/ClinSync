"""Output validation and clinical fact sanity guardrails."""

from typing import Any, Type, TypeVar
from pydantic import BaseModel, ValidationError

from clinsync_ai.providers.errors import StructuredOutputValidationError

T = TypeVar("T", bound=BaseModel)


class SchemaGuardResult(BaseModel):
    """Validation report from SchemaGuard."""
    is_valid: bool
    data: Any = None
    errors: list[str] = []


class OutputSchemaGuard:
    """Enforces strict schema constraints and clinical data invariants on LLM outputs."""

    @staticmethod
    def validate(raw_json: str | dict[str, Any], schema: Type[T]) -> tuple[T, SchemaGuardResult]:
        """Validate raw json string or dictionary against target schema."""
        errors: list[str] = []
        try:
            if isinstance(raw_json, str):
                parsed = schema.model_validate_json(raw_json)
            else:
                parsed = schema.model_validate(raw_json)
        except ValidationError as val_err:
            for err in val_err.errors():
                loc = ".".join(str(item) for item in err.get("loc", []))
                errors.append(f"{loc}: {err.get('msg')}")
            raise StructuredOutputValidationError(
                f"Output schema validation failed: {'; '.join(errors)}",
                raw_output=str(raw_json),
                validation_errors=val_err.errors(),
            ) from val_err
        except Exception as exc:
            raise StructuredOutputValidationError(
                f"Malformed JSON or unexpected data: {exc}",
                raw_output=str(raw_json),
            ) from exc

        return parsed, SchemaGuardResult(is_valid=True, data=parsed, errors=[])

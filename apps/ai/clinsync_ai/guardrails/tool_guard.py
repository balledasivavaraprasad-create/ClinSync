"""Tool policy guardrail enforcing least privilege and blocking unauthorized side effects."""

from typing import Any, Callable, Type
from pydantic import BaseModel, ValidationError

from clinsync_ai.providers.errors import ModelProviderError


class ToolPolicyViolationError(ModelProviderError):
    """Raised when an agent attempts to invoke an unauthorized, destructive, or unallowlisted tool."""
    def __init__(self, message: str, tool_name: str, reason: str = "POLICY_VIOLATION"):
        super().__init__(message=message, provider="tool_policy_guard", status_code=403, is_retryable=False)
        self.tool_name = tool_name
        self.reason = reason


class ToolDefinition(BaseModel):
    """Metadata and parameter schema for an allowlisted agent tool."""
    name: str
    description: str
    parameter_schema: Type[BaseModel] | None = None
    is_state_mutating: bool = False
    requires_human_confirmation: bool = False


# Default allowed tools for ClinSync intake and context retrieval
DEFAULT_ALLOWED_TOOLS: dict[str, ToolDefinition] = {
    "lookup_patient": ToolDefinition(
        name="lookup_patient",
        description="Query patient masked demographics by confirmation token",
        is_state_mutating=False,
    ),
    "query_schedule": ToolDefinition(
        name="query_schedule",
        description="Read available doctor appointment slots for an allowlisted specialty",
        is_state_mutating=False,
    ),
    "record_intake_turn": ToolDefinition(
        name="record_intake_turn",
        description="Append patient conversational answer to current encounter session",
        is_state_mutating=True,
    ),
    "search_documents": ToolDefinition(
        name="search_documents",
        description="Search indexed documents and lab reports for patient context",
        is_state_mutating=False,
    ),
}

# Forbidden tool patterns (arbitrary shell, raw SQL execution, destructive mutations)
FORBIDDEN_TOOL_PATTERNS = {
    "execute_sql",
    "run_shell",
    "bash",
    "eval",
    "exec",
    "drop_table",
    "direct_booking_commit",
    "autonomous_prescription",
}


class ToolPolicyGuard:
    """Enforces allowlists, argument schema validation, and authorization boundaries for tools."""

    def __init__(
        self,
        allowed_tools: dict[str, ToolDefinition] | None = None,
        enforce_read_only: bool = False,
    ):
        self.allowed_tools = allowed_tools or DEFAULT_ALLOWED_TOOLS.copy()
        self.enforce_read_only = enforce_read_only

    def authorize_tool_call(
        self,
        tool_name: str,
        arguments: dict[str, Any] | None = None,
        has_human_confirmation: bool = False,
    ) -> ToolDefinition:
        """Authorize a proposed tool invocation against safety policy."""
        name_clean = tool_name.strip().lower()

        # Step 1: Check against hard forbidden patterns
        if name_clean in FORBIDDEN_TOOL_PATTERNS:
            raise ToolPolicyViolationError(
                f"Tool '{tool_name}' is explicitly forbidden by security policy.",
                tool_name=tool_name,
                reason="FORBIDDEN_ACTION",
            )

        # Step 2: Check allowlist
        if name_clean not in self.allowed_tools:
            raise ToolPolicyViolationError(
                f"Tool '{tool_name}' is not in the authorized tool allowlist.",
                tool_name=tool_name,
                reason="TOOL_NOT_ALLOWLISTED",
            )

        tool_def = self.allowed_tools[name_clean]

        # Step 3: Check read-only constraint if active
        if self.enforce_read_only and tool_def.is_state_mutating:
            raise ToolPolicyViolationError(
                f"Tool '{tool_name}' causes state mutation but guardrail is in read-only mode.",
                tool_name=tool_name,
                reason="READ_ONLY_MODE_VIOLATION",
            )

        # Step 4: Check human confirmation if required
        if tool_def.requires_human_confirmation and not has_human_confirmation:
            raise ToolPolicyViolationError(
                f"Tool '{tool_name}' requires human confirmation before execution.",
                tool_name=tool_name,
                reason="HUMAN_CONFIRMATION_REQUIRED",
            )

        # Step 5: Validate parameter schema if defined
        if tool_def.parameter_schema and arguments is not None:
            try:
                tool_def.parameter_schema.model_validate(arguments)
            except ValidationError as val_err:
                raise ToolPolicyViolationError(
                    f"Invalid arguments for tool '{tool_name}': {val_err}",
                    tool_name=tool_name,
                    reason="SCHEMA_VALIDATION_FAILED",
                ) from val_err

        return tool_def

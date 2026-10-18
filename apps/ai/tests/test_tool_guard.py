"""Tests for ToolPolicyGuard authorization, allowlists, and execution boundaries."""

import pytest
from pydantic import BaseModel
from clinsync_ai.guardrails.tool_guard import (
    ToolDefinition,
    ToolPolicyGuard,
    ToolPolicyViolationError,
)


class SampleQueryScheduleArgs(BaseModel):
    specialty_id: str
    date_str: str


def test_tool_guard_authorizes_allowed_tools():
    guard = ToolPolicyGuard()
    tool_def = guard.authorize_tool_call("lookup_patient", {"confirmation_code": "1234"})
    assert tool_def.name == "lookup_patient"
    assert tool_def.is_state_mutating is False


def test_tool_guard_blocks_forbidden_destructive_tools():
    guard = ToolPolicyGuard()
    forbidden = ["execute_sql", "run_shell", "eval", "drop_table", "direct_booking_commit"]

    for tool in forbidden:
        with pytest.raises(ToolPolicyViolationError) as exc_info:
            guard.authorize_tool_call(tool)
        assert exc_info.value.reason == "FORBIDDEN_ACTION"


def test_tool_guard_blocks_unregistered_tools():
    guard = ToolPolicyGuard()
    with pytest.raises(ToolPolicyViolationError) as exc_info:
        guard.authorize_tool_call("unregistered_arbitrary_tool")
    assert exc_info.value.reason == "TOOL_NOT_ALLOWLISTED"


def test_tool_guard_enforces_read_only_mode():
    guard = ToolPolicyGuard(enforce_read_only=True)
    with pytest.raises(ToolPolicyViolationError) as exc_info:
        guard.authorize_tool_call("record_intake_turn")
    assert exc_info.value.reason == "READ_ONLY_MODE_VIOLATION"


def test_tool_guard_validates_argument_schemas():
    tools = {
        "query_schedule": ToolDefinition(
            name="query_schedule",
            description="Query doctor schedule",
            parameter_schema=SampleQueryScheduleArgs,
        )
    }
    guard = ToolPolicyGuard(allowed_tools=tools)

    # Valid args pass
    tool_def = guard.authorize_tool_call("query_schedule", {"specialty_id": "pulmonology", "date_str": "2026-10-20"})
    assert tool_def.name == "query_schedule"

    # Invalid args fail
    with pytest.raises(ToolPolicyViolationError) as exc_info:
        guard.authorize_tool_call("query_schedule", {"invalid_field": 123})
    assert exc_info.value.reason == "SCHEMA_VALIDATION_FAILED"

"""ClinSync AI Engine: Model gateway, LangGraph workflows, guardrails, and evals."""

from clinsync_ai.guardrails.prompt_guard import PromptGuard
from clinsync_ai.guardrails.schema_guard import OutputSchemaGuard, SchemaGuard
from clinsync_ai.guardrails.tool_guard import ToolPolicyGuard
from clinsync_ai.observability.trace import TraceEmitter, TraceManager, get_trace_emitter
from clinsync_ai.providers.base import ModelProvider, ModelResponse, ProviderUsage
from clinsync_ai.providers.fake import FakeModelProvider
from clinsync_ai.providers.gemini import GeminiProvider
from clinsync_ai.providers.groq import GroqProvider
from clinsync_ai.routing.gateway import ModelGateway

__version__ = "0.1.0"

__all__ = [
    "ModelGateway",
    "ModelProvider",
    "ModelResponse",
    "ProviderUsage",
    "GeminiProvider",
    "GroqProvider",
    "FakeModelProvider",
    "PromptGuard",
    "SchemaGuard",
    "OutputSchemaGuard",
    "ToolPolicyGuard",
    "TraceEmitter",
    "TraceManager",
    "get_trace_emitter",
]

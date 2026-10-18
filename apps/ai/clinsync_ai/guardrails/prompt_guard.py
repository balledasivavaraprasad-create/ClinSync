"""Input safety and adversarial prompt injection filters."""

import re
from pydantic import BaseModel


class PromptSafetyResult(BaseModel):
    """Result of prompt safety analysis."""
    is_safe: bool
    risk_score: float = 0.0
    detected_patterns: list[str] = []
    reason: str | None = None


INJECTION_PATTERNS = [
    (r"ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts|rules)", "INSTRUCTION_OVERRIDE"),
    (r"disregard\s+(the\s+)?(above|system)\s+(instructions|prompt)", "INSTRUCTION_OVERRIDE"),
    (r"(reveal|print|show|dump)\s+(the\s+)?(system\s+prompt|developer\s+message)", "SYSTEM_PROMPT_LEAK"),
    (r"you\s+are\s+now\s+(in\s+developer\s+mode|dan|unrestricted)", "JAILBREAK_ROLEPLAY"),
    (r"bypass\s+(?:(?:triage|safety|escalation|clinical)\s+)+(?:policy|gate|protocol|rules?)", "SAFETY_BYPASS"),
    (r"act\s+as\s+(an?\s+)?admin(istrator)?", "PRIVILEGE_ESCALATION"),
    (r"drop\s+table|delete\s+from|select\s+.*\s+from\s+users", "SQL_INJECTION"),
]


class PromptGuard:
    """Evaluates input prompts for prompt injection, jailbreaks, and policy overrides."""

    def __init__(self, strict_mode: bool = False):
        self.strict_mode = strict_mode
        self._compiled_patterns = [(re.compile(pat, re.IGNORECASE), name) for pat, name in INJECTION_PATTERNS]

    def evaluate(self, text: str) -> PromptSafetyResult:
        if not text or not text.strip():
            return PromptSafetyResult(is_safe=True, risk_score=0.0)

        detected = []
        for regex, name in self._compiled_patterns:
            if regex.search(text):
                detected.append(name)

        if detected:
            risk = min(1.0, 0.4 * len(detected))
            return PromptSafetyResult(
                is_safe=False,
                risk_score=risk,
                detected_patterns=detected,
                reason=f"Detected adversarial patterns: {', '.join(set(detected))}",
            )

        return PromptSafetyResult(is_safe=True, risk_score=0.0)

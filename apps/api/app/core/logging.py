"""Structured safe logging configuration with active sensitive data redaction."""

import logging
import re
import sys


class SafeFormatter(logging.Formatter):
    """Formatter that prevents logging raw sensitive health records, tokens, or secrets."""

    REDACTION_PATTERNS = [
        (
            re.compile(
                r"(AIza[0-9A-Za-z-_]{20,}|AQ\.[0-9A-Za-z-_]{20,}|gsk_[0-9A-Za-z]{20,}|sk-[0-9a-zA-Z-]{20,})"
            ),
            "[REDACTED_KEY]",
        ),
        (re.compile(r"Bearer\s+[A-Za-z0-9-_=.]+"), "Bearer [REDACTED_TOKEN]"),
        (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[REDACTED_SSN]"),
        (re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"), "[REDACTED_CARD]"),
        (re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"), "[REDACTED_PHONE]"),
        (
            re.compile(r"(password|secret|api_key)=['\"]?[^'\"\s]+['\"]?", re.IGNORECASE),
            r"\1=[REDACTED]",
        ),
    ]

    def format(self, record: logging.LogRecord) -> str:
        """Format the log record and redact all sensitive patterns."""
        msg = super().format(record)
        for pattern, repl in self.REDACTION_PATTERNS:
            msg = pattern.sub(repl, msg)
        return msg


def redact_sensitive_text(text: str) -> str:
    """Mask sensitive patterns (SSN, cards, phone, credentials) in raw strings."""
    if not text:
        return ""
    result = text
    for pattern, repl in SafeFormatter.REDACTION_PATTERNS:
        result = pattern.sub(repl, result)
    return result


def setup_logging(log_level: str = "INFO") -> None:
    """Configure structured logging with SafeFormatter."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        SafeFormatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    # Avoid duplicate handlers
    if not root_logger.handlers:
        root_logger.addHandler(handler)


logger = logging.getLogger("clinsync.api")

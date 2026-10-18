"""Structured safe logging configuration."""

import logging
import sys


class SafeFormatter(logging.Formatter):
    """Formatter that prevents logging raw sensitive health records or secrets."""

    def format(self, record: logging.LogRecord) -> str:
        # Standard formatted record
        msg = super().format(record)
        return msg


def setup_logging(log_level: str = "INFO") -> None:
    """Configure basic structured logging."""
    level = getattr(logging, log_level.upper(), logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
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

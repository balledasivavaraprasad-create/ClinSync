"""Document parser adapter with page boundary and prompt injection detection."""

import base64
import hashlib
import re
from pydantic import BaseModel, Field

from clinsync_ai.guardrails.prompt_guard import PromptGuard


class DocumentPage(BaseModel):
    """Single page within a parsed document with page coordinate and text."""
    page_number: int
    text: str
    checksum: str | None = None


class ParsedDocument(BaseModel):
    """Parsed document container retaining metadata, page boundaries, and safety status."""
    document_id: str
    filename: str
    mime_type: str
    checksum: str
    total_pages: int
    pages: list[DocumentPage] = Field(default_factory=list)
    is_safe: bool = True
    detected_threats: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)

    @property
    def full_text(self) -> str:
        return "\n\n".join(f"--- Page {p.page_number} ---\n{p.text}" for p in self.pages)


class DocumentParser:
    """Extracts text and page boundaries from raw text, base64 payloads, or synthetic documents."""

    ALLOWED_MIME_TYPES = {
        "application/pdf",
        "text/plain",
        "image/png",
        "image/jpeg",
    }
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit

    def __init__(self, prompt_guard: PromptGuard | None = None):
        self.prompt_guard = prompt_guard or PromptGuard()

    def parse(
        self,
        document_id: str,
        filename: str,
        mime_type: str,
        content: str | bytes,
    ) -> ParsedDocument:
        """Parse raw content or base64 into a structured ParsedDocument with page provenance."""
        # 1. MIME type validation
        normalized_mime = mime_type.lower().strip()
        if normalized_mime not in self.ALLOWED_MIME_TYPES:
            raise ValueError(
                f"Unsupported MIME type '{mime_type}'. Supported types: {sorted(self.ALLOWED_MIME_TYPES)}"
            )

        # 2. Extract bytes and calculate deterministic SHA-256 checksum
        if isinstance(content, str):
            # Check if content is base64 encoded
            try:
                raw_bytes = base64.b64decode(content, validate=True)
            except Exception:
                raw_bytes = content.encode("utf-8")
        else:
            raw_bytes = content

        if len(raw_bytes) > self.MAX_FILE_SIZE_BYTES:
            raise ValueError(
                f"File size {len(raw_bytes)} bytes exceeds maximum allowed limit ({self.MAX_FILE_SIZE_BYTES} bytes)."
            )

        doc_checksum = hashlib.sha256(raw_bytes).hexdigest()

        # 3. Text extraction and page segmentation
        pages = self._extract_pages(raw_bytes, normalized_mime)

        # 4. Prompt injection screening (Treat document content as untrusted input)
        is_safe = True
        detected_threats = []
        notes = []

        for page in pages:
            safety = self.prompt_guard.evaluate(page.text)
            if not safety.is_safe:
                is_safe = False
                threat_msg = f"Page {page.page_number}: {safety.reason}"
                detected_threats.append(threat_msg)
                notes.append(
                    f"Untrusted instructions detected on page {page.page_number}; treating strictly as clinical text content, not execution directives."
                )

        return ParsedDocument(
            document_id=document_id,
            filename=filename,
            mime_type=normalized_mime,
            checksum=doc_checksum,
            total_pages=len(pages),
            pages=pages,
            is_safe=is_safe,
            detected_threats=detected_threats,
            notes=notes,
        )

    def _extract_pages(self, raw_bytes: bytes, mime_type: str) -> list[DocumentPage]:
        """Split text across page boundaries."""
        try:
            text = raw_bytes.decode("utf-8", errors="replace")
        except Exception:
            text = str(raw_bytes)

        # Check for explicit form feed page breaks (\f) or page markers
        raw_pages = re.split(r"\f|(?:\n--- Page \d+ ---\n)", text)
        pages: list[DocumentPage] = []

        for idx, page_content in enumerate(raw_pages, start=1):
            cleaned = page_content.strip()
            if cleaned:
                page_chk = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()[:12]
                pages.append(
                    DocumentPage(
                        page_number=idx,
                        text=cleaned,
                        checksum=page_chk,
                    )
                )

        if not pages:
            # Empty or unreadable document fallback
            pages.append(
                DocumentPage(
                    page_number=1,
                    text=text.strip() or "[Empty Document Content]",
                    checksum=hashlib.sha256(text.encode("utf-8")).hexdigest()[:12],
                )
            )

        return pages

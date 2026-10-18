"""LlamaIndex-backed clinical document indexing and patient-isolated retrieval adapter."""

import math
import re
from typing import Any
from pydantic import BaseModel, Field

from llama_index.core import Document
from clinsync_ai.documents.parser import ParsedDocument


class DocumentSearchResult(BaseModel):
    """Result of a scoped clinical document search with precise provenance."""
    document_id: str
    patient_id: str
    encounter_id: str | None = None
    page_number: int
    page_label: str  # e.g. "Page 1"
    snippet: str
    score: float
    checksum: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ClinicalDocumentIndex:
    """In-memory LlamaIndex-compatible document index enforcing strict patient isolation."""

    def __init__(self):
        # Maps patient_id -> list of LlamaIndex Document instances
        self._patient_documents: dict[str, list[Document]] = {}
        # Track indexed document IDs for deduplication and provenance lookup
        self._indexed_doc_ids: set[str] = set()

    def index_parsed_document(
        self,
        document: ParsedDocument,
        patient_id: str,
        encounter_id: str | None = None,
    ) -> int:
        """Convert ParsedDocument pages into LlamaIndex Document nodes and index under patient_id."""
        if not patient_id:
            raise ValueError("patient_id is required for document indexing to preserve patient isolation.")

        indexed_chunks = 0
        for page in document.pages:
            metadata = {
                "document_id": document.document_id,
                "filename": document.filename,
                "mime_type": document.mime_type,
                "patient_id": patient_id,
                "encounter_id": encounter_id,
                "page_number": page.page_number,
                "page_label": f"Page {page.page_number}",
                "doc_checksum": document.checksum,
                "page_checksum": page.checksum,
                "is_safe": document.is_safe,
            }
            doc_node = Document(
                text=page.text,
                metadata=metadata,
                id_=f"{document.document_id}-p{page.page_number}",
            )
            self._patient_documents.setdefault(patient_id, []).append(doc_node)
            indexed_chunks += 1

        self._indexed_doc_ids.add(document.document_id)
        return indexed_chunks

    def search(
        self,
        query: str,
        patient_id: str,
        encounter_id: str | None = None,
        top_k: int = 3,
        min_score: float = 0.05,
    ) -> list[DocumentSearchResult]:
        """Query documents for a specific patient. Enforces strict patient isolation."""
        if not patient_id:
            raise ValueError("patient_id is required for search to prevent cross-patient data leaks.")

        patient_docs = self._patient_documents.get(patient_id, [])
        if not patient_docs or not query or not query.strip():
            return []

        # Tokenize query for relevance scoring
        query_tokens = set(re.findall(r"\b\w{3,}\b", query.lower()))
        if not query_tokens:
            return []

        scored_results: list[DocumentSearchResult] = []

        for doc in patient_docs:
            # Filter by encounter_id if specified
            if encounter_id and doc.metadata.get("encounter_id") not in (None, encounter_id):
                continue

            text = doc.text or ""
            text_lower = text.lower()
            text_tokens = re.findall(r"\b\w{3,}\b", text_lower)
            if not text_tokens:
                continue

            # Calculate term frequency / keyword overlap score
            hits = sum(1 for token in query_tokens if token in text_lower)
            if hits == 0:
                continue

            score = min(1.0, hits / math.sqrt(len(query_tokens) * max(1, math.log(len(text_tokens) + 1))))

            if score < min_score:
                continue

            # Extract focused snippet around the first matching query term
            snippet = self._extract_snippet(text, query_tokens)

            scored_results.append(
                DocumentSearchResult(
                    document_id=doc.metadata["document_id"],
                    patient_id=doc.metadata["patient_id"],
                    encounter_id=doc.metadata.get("encounter_id"),
                    page_number=doc.metadata["page_number"],
                    page_label=doc.metadata["page_label"],
                    snippet=snippet,
                    score=round(score, 3),
                    checksum=doc.metadata.get("doc_checksum"),
                    metadata=doc.metadata,
                )
            )

        # Sort descending by relevance score
        scored_results.sort(key=lambda r: r.score, reverse=True)
        return scored_results[:top_k]

    def _extract_snippet(self, text: str, query_tokens: set[str], max_len: int = 150) -> str:
        """Find the earliest occurrence of a query token and extract surrounding context."""
        text_lower = text.lower()
        first_pos = -1
        for tok in query_tokens:
            idx = text_lower.find(tok)
            if idx != -1 and (first_pos == -1 or idx < first_pos):
                first_pos = idx

        if first_pos == -1:
            return text[:max_len] + ("..." if len(text) > max_len else "")

        start = max(0, first_pos - 40)
        end = min(len(text), first_pos + 110)
        snippet = text[start:end].strip()
        if start > 0:
            snippet = f"...{snippet}"
        if end < len(text):
            snippet = f"{snippet}..."
        return snippet

    def get_indexed_document_ids(self, patient_id: str | None = None) -> set[str]:
        """Return registered document IDs, optionally scoped to a patient."""
        if patient_id:
            docs = self._patient_documents.get(patient_id, [])
            return {d.metadata["document_id"] for d in docs}
        return set(self._indexed_doc_ids)

    def is_document_indexed(self, document_id: str, patient_id: str | None = None) -> bool:
        """Verify if a specific document is indexed."""
        return document_id in self.get_indexed_document_ids(patient_id)

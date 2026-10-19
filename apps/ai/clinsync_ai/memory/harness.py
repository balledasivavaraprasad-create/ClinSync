"""Mem0 Memory Harness for clinical intake and agentic memory management."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
import uuid


@dataclass
class MemoryItem:
    """Represents a single episodic or semantic memory item."""
    id: str
    user_id: str
    encounter_id: str
    turn_index: int
    content: str
    concept: str
    status: str = "active"
    negated: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Mem0MemoryHarness:
    """Intelligent memory harness for agentic patient intake.
    
    Provides episodic recall across conversational turns, tracks patient statements,
    retains self-corrections (negated vs affirmed facts), and synthesizes contextual
    memory prompts for follow-up question generation.
    """

    def __init__(self, client: Any | None = None):
        """Initialize the memory harness.
        
        Args:
            client: Optional mem0.Memory client. If not provided or unavailable,
                    falls back to the built-in structured semantic memory store.
        """
        self._external_client = client
        self._store: dict[str, list[MemoryItem]] = {}  # encounter_id -> list[MemoryItem]

    def add(
        self,
        content: str,
        user_id: str,
        encounter_id: str,
        turn_index: int,
        concept: str = "general",
        negated: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> MemoryItem:
        """Add a memory item for an encounter session."""
        meta = metadata or {}
        item = MemoryItem(
            id=f"MEM-{uuid.uuid4().hex[:8].upper()}",
            user_id=user_id,
            encounter_id=encounter_id,
            turn_index=turn_index,
            content=content.strip(),
            concept=concept,
            negated=negated,
            metadata=meta,
        )

        if encounter_id not in self._store:
            self._store[encounter_id] = []
        self._store[encounter_id].append(item)

        # Mirror to external mem0 client if configured
        if self._external_client is not None:
            try:
                self._external_client.add(
                    content,
                    user_id=user_id,
                    metadata={"encounter_id": encounter_id, "turn_index": turn_index, **meta},
                )
            except Exception:
                pass

        return item

    def get_all(self, encounter_id: str) -> list[MemoryItem]:
        """Retrieve all memory items for a specific encounter in chronological order."""
        return list(self._store.get(encounter_id, []))

    def search(
        self,
        query: str,
        encounter_id: str,
        limit: int = 5,
        include_negated: bool = True,
    ) -> list[MemoryItem]:
        """Search relevant memories for an encounter using lexical/semantic relevance."""
        items = self._store.get(encounter_id, [])
        if not include_negated:
            items = [i for i in items if not i.negated]

        if not query.strip():
            return items[-limit:]

        query_terms = set(query.lower().split())

        def score(item: MemoryItem) -> int:
            content_lower = item.content.lower()
            concept_lower = item.concept.lower()
            matches = sum(1 for term in query_terms if term in content_lower or term in concept_lower)
            return matches

        scored = [(score(i), i) for i in items]
        scored.sort(key=lambda x: (x[0], x[1].turn_index), reverse=True)
        return [i for _, i in scored[:limit]]

    def get_affirmed_and_negated(self, encounter_id: str) -> tuple[list[str], list[str]]:
        """Return lists of affirmed and explicitly ruled out (negated) concepts."""
        items = self._store.get(encounter_id, [])
        affirmed: list[str] = []
        negated: list[str] = []
        for i in items:
            if i.negated:
                negated.append(i.content)
            else:
                affirmed.append(i.content)
        return affirmed, negated

    def format_memory_for_prompt(self, encounter_id: str) -> str:
        """Format stored memories into rich clinical context for next-question synthesis."""
        items = self._store.get(encounter_id, [])
        if not items:
            return "No previous memories recorded for this patient."

        lines = ["Previous Patient Statements & Clinical Memory (chronological):"]
        for i in items:
            prefix = "✕ Ruled Out / Negated" if i.negated else "✓ Affirmed"
            lines.append(f"- [Turn {i.turn_index}] {prefix} ({i.concept}): \"{i.content}\"")

        return "\n".join(lines)

    def clear(self, encounter_id: str | None = None) -> None:
        """Clear memory for an encounter or all encounters."""
        if encounter_id:
            self._store.pop(encounter_id, None)
        else:
            self._store.clear()


# Default global memory harness instance
default_memory_harness = Mem0MemoryHarness()

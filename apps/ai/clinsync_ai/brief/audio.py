"""Audio summary generation and graceful text fallback service."""

import math
from typing import Any
from clinsync_ai.brief.models import AudioStatus


class AudioBriefService:
    """Produces a conversational clinician audio summary (~60s) with text-fallback resilience."""

    WORDS_PER_SECOND = 2.4  # Approx ~144 words per minute

    def __init__(self, tts_adapter: Any | None = None):
        self.tts_adapter = tts_adapter

    def compose_spoken_script(
        self,
        patient_name: str | None,
        chief_complaint: str | None,
        patient_reported: list[str],
        extracted_facts: list[str],
        historical_records: list[str],
        unresolved_conflicts: list[str],
    ) -> str:
        """Compose a high-yield, natural clinical spoken summary designed for 45-60 seconds playback."""
        p_name = patient_name or "Patient"
        cc = chief_complaint or "Intake evaluation"

        parts: list[str] = []
        parts.append(f"ClinSync clinical brief for {p_name}. Presenting with: {cc}.")

        # Reported acute symptoms
        if patient_reported:
            symptoms_preview = "; ".join(patient_reported[:3])
            parts.append(f"Current reported intake: {symptoms_preview}.")

        # Pertinent extracted clinical findings
        if extracted_facts:
            extracted_preview = "; ".join(extracted_facts[:3])
            parts.append(f"Extracted document findings: {extracted_preview}.")

        # Relevant historical baseline
        if historical_records:
            hist_preview = "; ".join(historical_records[:2])
            parts.append(f"Recorded historical context: {hist_preview}.")

        # Unresolved conflicts & red flags (High clinical priority)
        if unresolved_conflicts:
            conflict_preview = "; ".join(unresolved_conflicts)
            parts.append(f"Attention required: {conflict_preview}.")
        else:
            parts.append("No active contraindications or document conflicts detected.")

        parts.append("Full source-linked evidence ledger available in the clinician console.")

        script = " ".join(parts)
        return script

    def generate_audio_summary(
        self,
        spoken_script: str,
        encounter_id: str,
    ) -> tuple[str, AudioStatus, str | None, float]:
        """Synthesize audio summary or gracefully degrade to text fallback if TTS is unavailable."""
        words = len(spoken_script.split())
        estimated_seconds = round(words / self.WORDS_PER_SECOND, 1)

        # Graceful text fallback if no external TTS adapter is configured or synthesis fails
        if not self.tts_adapter:
            return spoken_script, AudioStatus.UNAVAILABLE, None, estimated_seconds

        try:
            audio_url = self.tts_adapter.synthesize(text=spoken_script, encounter_id=encounter_id)
            return spoken_script, AudioStatus.READY, audio_url, estimated_seconds
        except Exception:
            # Graceful degradation: never fail the clinical workflow because audio synthesis errored
            return spoken_script, AudioStatus.UNAVAILABLE, None, estimated_seconds

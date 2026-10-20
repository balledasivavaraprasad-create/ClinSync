"""High-level Doctor Brief Service coordinating generation, audio, and OpenAPI response."""

import uuid

from clinsync_ai.brief.audio import AudioBriefService
from clinsync_ai.brief.generator import DoctorBriefGenerator
from clinsync_ai.brief.models import DoctorBriefResponse
from clinsync_ai.graph.state import ClinicalFactModel
from clinsync_ai.observability.trace import TraceManager
from clinsync_ai.routing.gateway import ModelGateway


class DoctorBriefService:
    """Service providing evidence-backed doctor brief generation and audio summaries."""

    def __init__(
        self,
        gateway: ModelGateway,
        trace_manager: TraceManager | None = None,
        audio_service: AudioBriefService | None = None,
    ):
        self.gateway = gateway
        self.trace_manager = trace_manager or TraceManager()
        self.audio_service = audio_service or AudioBriefService()
        self.generator = DoctorBriefGenerator(
            gateway=self.gateway,
            audio_service=self.audio_service,
        )

    def generate_brief(
        self,
        encounter_id: str,
        patient_id: str,
        current_facts: list[ClinicalFactModel],
        historical_facts: list[ClinicalFactModel] | None = None,
        unresolved_conflicts: list[str] | None = None,
        patient_name: str | None = None,
        chief_complaint: str | None = None,
        missing_information: list[str] | None = None,
        request_id: str | None = None,
    ) -> DoctorBriefResponse:
        """Generate an evidence-backed doctor brief matching OpenAPI contract."""
        req_id = request_id or f"req-brief-{uuid.uuid4().hex[:12]}"
        trace_id = f"trace-brief-{encounter_id.lower()}"

        brief_data = self.generator.generate(
            encounter_id=encounter_id,
            patient_id=patient_id,
            current_facts=current_facts,
            historical_facts=historical_facts,
            unresolved_conflicts=unresolved_conflicts,
            patient_name=patient_name,
            chief_complaint=chief_complaint,
            missing_information=missing_information,
            trace_id=trace_id,
        )

        return DoctorBriefResponse(
            data=brief_data,
            request_id=req_id,
        )

"""Live demonstration script that executes real ClinSync AI workflows and streams traces to Langfuse."""

import os
import sys
import uuid
from pathlib import Path

# Add apps/ai and repo root to sys.path
repo_root = Path(__file__).resolve().parent.parent.parent.parent
apps_ai_path = repo_root / "apps" / "ai"
if str(apps_ai_path) not in sys.path:
    sys.path.insert(0, str(apps_ai_path))
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from dotenv import load_dotenv
load_dotenv(repo_root / ".env")

from clinsync_ai.brief.service import DoctorBriefService
from clinsync_ai.documents.extractor import DocumentFactExtractor
from clinsync_ai.documents.parser import DocumentParser
from clinsync_ai.intake.service import AdaptiveIntakeService
from clinsync_ai.observability.trace import TraceManager
from clinsync_ai.routing.gateway import ModelGateway
from clinsync_ai.routing.service import RoutingReviewService


def run_live_telemetry_demo():
    print("=" * 65)
    print(" ClinSync Live AI Workflow & Langfuse Telemetry Emission ")
    print("=" * 65)

    # 1. Initialize Gateway with live Gemini provider and Langfuse telemetry
    tm = TraceManager()
    gw = ModelGateway(trace_manager=tm)
    print(f"\n[1] Initialized ModelGateway with provider: {gw.primary.provider_name}")
    print(f"    Langfuse Cloud Telemetry Active: {tm.is_cloud_enabled}")
    print(f"    Langfuse Host: {tm.host}")

    encounter_id = f"ENC-LIVE-{uuid.uuid4().hex[:8].upper()}"
    patient_id = "PAT-SYNTH-ELEANOR"
    print(f"    Active Encounter ID: {encounter_id}")

    # 2. Adaptive Conversational Intake (Live Gemini Extraction)
    print("\n[2] Executing Multi-Turn Adaptive Intake via Gemini...")
    intake = AdaptiveIntakeService(gateway=gw)

    # Turn 1
    t1_text = "I have had a worsening dry cough and mild chest tightness for the past 4 days."
    print(f"    Patient Statement 1: \"{t1_text}\"")
    turn1 = intake.advance(encounter_id=encounter_id, patient_statement=t1_text, patient_id=patient_id)
    print(f"    -> Status: {turn1.status}")
    print(f"    -> Extracted Facts: {[f.concept + ': ' + f.value for f in turn1.extracted_facts]}")
    print(f"    -> ClinSync Next Question: \"{turn1.next_question}\"")

    # Turn 2
    t2_text = "No allergies. I take Lisinopril 10mg daily for mild hypertension."
    print(f"\n    Patient Statement 2: \"{t2_text}\"")
    turn2 = intake.advance(encounter_id=encounter_id, patient_statement=t2_text, patient_id=patient_id)
    print(f"    -> Status: {turn2.status}")
    print(f"    -> Extracted Facts: {[f.concept + ': ' + f.value for f in turn2.extracted_facts]}")
    print(f"    -> ClinSync Next Question: \"{turn2.next_question}\"")

    # 3. Document Extraction & Provenance
    print("\n[3] Parsing & Extracting Clinical Document...")
    parser = DocumentParser()
    sample_doc = (
        "--- Page 1 ---\n"
        "CLINICAL CONSULTATION REPORT\n"
        "Patient: Eleanor Johnson | DOB: 1968-11-04\n"
        "Diagnosis: Essential Hypertension, Mild Bronchial Hyperreactivity\n"
        "Vitals: BP 138/86 mmHg, HR 74 bpm, SpO2 98% on room air\n"
        "\f--- Page 2 ---\n"
        "MEDICATION RECONCILIATION\n"
        "Active Rx: Lisinopril 10mg PO once daily in morning\n"
        "Allergies: NKDA (No Known Drug Allergies)\n"
        "Assessment: Stable hypertension; recommend follow-up in 6 months.\n"
    )
    parsed_doc = parser.parse(
        document_id="DOC-CARDIO-CONSULT-01",
        filename="cardio_consult_report.pdf",
        mime_type="application/pdf",
        content=sample_doc,
    )
    doc_extractor = DocumentFactExtractor(gateway=gw)
    doc_facts = doc_extractor.extract_from_document(
        document=parsed_doc,
        patient_id=patient_id,
        encounter_id=encounter_id,
    )
    print(f"    -> Successfully extracted {len(doc_facts)} provenance-linked facts from {parsed_doc.total_pages} pages.")

    # 4. Specialty Recommendation & Triage Guardrails
    print("\n[4] Evaluating Specialty Recommendation & Triage Guardrail...")
    routing_service = RoutingReviewService(gateway=gw)
    decision = routing_service.review_encounter(
        encounter_id=encounter_id,
        chief_complaint="Worsening dry cough and mild chest tightness for 4 days",
        symptoms=["subacute dry cough", "mild chest tightness"],
        facts=turn1.extracted_facts + turn2.extracted_facts,
    )
    print(f"    -> Triage Decision: {decision.data.decision}")
    print(f"    -> Recommended Department: {decision.data.recommended_department_id}")
    print(f"    -> Reason Codes: {decision.data.reason_codes}")

    # 5. Evidence-Backed Doctor Brief & Audio Summary (Task 5)
    print("\n[5] Generating Evidence-Backed Doctor Brief & Audio Summary...")
    brief_svc = DoctorBriefService(gateway=gw, trace_manager=tm)
    brief_resp = brief_svc.generate_brief(
        encounter_id=encounter_id,
        patient_id=patient_id,
        patient_name="Eleanor Johnson",
        chief_complaint="Worsening dry cough and mild chest tightness for 4 days",
        current_facts=turn1.extracted_facts + turn2.extracted_facts + doc_facts,
        historical_facts=[],
        unresolved_conflicts=[],
        missing_information=["Immunization history not recorded in EHR"],
    )
    print(f"    -> Summary: \"{brief_resp.data.summary_text[:110]}...\"")
    print(f"    -> Evidence Citations Count: {len(brief_resp.data.citations)}")
    print(f"    -> Audio Status: {brief_resp.data.audio_status}")
    print(f"    -> Spoken Script Duration: ~{brief_resp.data.estimated_speech_seconds}s")

    # 6. Flush all traces to Langfuse Collector
    print("\n[6] Flushing Telemetry to Langfuse Cloud...")
    tm.flush()
    print("    -> Flush complete.")

    # 7. Display direct trace URLs
    print("\n" + "=" * 65)
    print(" LIVE LANGFUSE TRACES GENERATED:")
    print("=" * 65)
    client = tm._langfuse_client
    if client:
        from clinsync_ai.observability.trace import _format_trace_id
        recent = tm.get_recent_records(limit=10)
        seen_urls = set()
        for r in recent:
            valid_tid = _format_trace_id(r.trace_id)
            trace_url = client.get_trace_url(trace_id=valid_tid)
            if trace_url not in seen_urls:
                seen_urls.add(trace_url)
                print(f"- Step: {r.step_name:30} | {r.provider}:{r.model:18} | {r.latency_ms:5.0f}ms")
                print(f"  URL: {trace_url}")
    print("=" * 65)
    print("\nOpen your Langfuse dashboard to view the traces with full inputs, outputs, tokens, and latency breakdown!\n")


if __name__ == "__main__":
    run_live_telemetry_demo()

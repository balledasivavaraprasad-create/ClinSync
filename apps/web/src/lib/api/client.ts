import { mockApi } from './mockAdapter';
import type {
  CreateEncounterRequest,
  EncounterResponse,
  CandidateLookupRequest,
  CandidateLookupResponse,
  IdentityConfirmRequest,
  IdentityConfirmResponse,
  PatientContextResponse,
  IntakeAnswerRequest,
  IntakeStateResponse,
  DocumentUploadRequest,
  DocumentStatusResponse,
  LedgerResponse,
  DiffResponse,
  DecisionResultResponse,
  SlotsResponse,
  BookingRequest,
  BookingResponse,
  DoctorQueueResponse,
  DoctorBriefResponse,
  ApprovalRequest,
  ApprovalResponse,
} from './types';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `API error: ${response.statusText}`);
  }

  return response.json();
}

export const apiClient = {
  isMock: USE_MOCKS,

  async createEncounter(req: CreateEncounterRequest): Promise<EncounterResponse> {
    if (USE_MOCKS) return mockApi.createEncounter(req);
    return request<EncounterResponse>('/encounters', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async lookupCandidates(req: CandidateLookupRequest): Promise<CandidateLookupResponse> {
    if (USE_MOCKS) return mockApi.lookupCandidates(req);
    return request<CandidateLookupResponse>('/identity/candidates', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async confirmIdentity(req: IdentityConfirmRequest): Promise<IdentityConfirmResponse> {
    if (USE_MOCKS) return mockApi.confirmIdentity(req);
    return request<IdentityConfirmResponse>('/identity/confirm', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async getPatientContext(patientId: string): Promise<PatientContextResponse> {
    if (USE_MOCKS) return mockApi.getPatientContext(patientId);
    return request<PatientContextResponse>(`/patients/${patientId}/context`);
  },

  async submitAnswer(
    encounterId: string,
    req: IntakeAnswerRequest
  ): Promise<IntakeStateResponse> {
    if (USE_MOCKS) return mockApi.submitAnswer(encounterId, req);
    return request<IntakeStateResponse>(`/encounters/${encounterId}/answers`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async uploadDocument(
    encounterId: string,
    req: DocumentUploadRequest
  ): Promise<DocumentStatusResponse> {
    if (USE_MOCKS) return mockApi.uploadDocument(encounterId, req);
    return request<DocumentStatusResponse>(`/encounters/${encounterId}/documents`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async getDocumentStatus(documentId: string): Promise<DocumentStatusResponse> {
    if (USE_MOCKS) return mockApi.getDocumentStatus(documentId);
    return request<DocumentStatusResponse>(`/documents/${documentId}/status`);
  },

  async getLedger(encounterId: string): Promise<LedgerResponse> {
    if (USE_MOCKS) return mockApi.getLedger(encounterId);
    return request<LedgerResponse>(`/encounters/${encounterId}/ledger`);
  },

  async getDiff(encounterId: string): Promise<DiffResponse> {
    if (USE_MOCKS) return mockApi.getDiff(encounterId);
    return request<DiffResponse>(`/encounters/${encounterId}/diff`);
  },

  async reviewRouting(encounterId: string): Promise<DecisionResultResponse> {
    if (USE_MOCKS) return mockApi.reviewRouting(encounterId);
    return request<DecisionResultResponse>(`/encounters/${encounterId}/routing-review`, {
      method: 'POST',
    });
  },

  async getSlots(departmentId: string): Promise<SlotsResponse> {
    if (USE_MOCKS) return mockApi.getSlots(departmentId);
    return request<SlotsResponse>(`/appointments/slots?department_id=${departmentId}`);
  },

  async bookAppointment(req: BookingRequest): Promise<BookingResponse> {
    if (USE_MOCKS) return mockApi.bookAppointment(req);
    return request<BookingResponse>('/appointments', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async getDoctorQueue(doctorId: string): Promise<DoctorQueueResponse> {
    if (USE_MOCKS) return mockApi.getDoctorQueue(doctorId);
    return request<DoctorQueueResponse>(`/doctors/${doctorId}/queue`);
  },

  async getDoctorBrief(encounterId: string): Promise<DoctorBriefResponse> {
    if (USE_MOCKS) return mockApi.getDoctorBrief(encounterId);
    return request<DoctorBriefResponse>(`/encounters/${encounterId}/brief`);
  },

  async generateDoctorBrief(encounterId: string): Promise<DoctorBriefResponse> {
    if (USE_MOCKS) return mockApi.generateDoctorBrief(encounterId);
    return request<DoctorBriefResponse>(`/encounters/${encounterId}/brief`);
  },

  async submitDoctorApproval(
    encounterId: string,
    req: ApprovalRequest
  ): Promise<ApprovalResponse> {
    if (USE_MOCKS) return mockApi.submitDoctorApproval(encounterId, req);
    return request<ApprovalResponse>(`/encounters/${encounterId}/approvals`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
};

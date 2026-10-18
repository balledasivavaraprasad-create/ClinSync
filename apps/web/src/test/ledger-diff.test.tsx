import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentUploadZone } from '../features/documents/DocumentUploadZone';
import { DocumentViewerModal } from '../features/documents/DocumentViewerModal';
import { ClinicalContextLedger } from '../features/patient-context/ClinicalContextLedger';
import { ContextDiffView } from '../features/patient-context/ContextDiffView';
import { LedgerDiffHub } from '../features/patient-context/LedgerDiffHub';
import { mockClinicalFacts } from '../lib/api/mockData';

describe('TASK-P1-301: Upload, Clinical Context Ledger and Context Diff UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DocumentUploadZone Component', () => {
    it('renders upload drop zone and initial documents', () => {
      render(<DocumentUploadZone />);

      expect(screen.getByTestId('document-upload-zone')).toBeInTheDocument();
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
      expect(screen.getByText(/Clinical Document Upload/i)).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop your clinical documents/i)).toBeInTheDocument();
      expect(screen.getByText(/St. Jude Pharmacy Refill Order.pdf/i)).toBeInTheDocument();
    });

    it('rejects unsupported file formats with an accessible error alert', async () => {
      render(<DocumentUploadZone />);

      const fileInput = screen.getByTestId('file-input');
      const badFile = new File(['executable content'], 'virus.exe', { type: 'application/x-msdownload' });

      fireEvent.change(fileInput, { target: { files: [badFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('upload-error-alert')).toBeInTheDocument();
        expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument();
      });
    });

    it('rejects oversized files exceeding 10MB limit', async () => {
      render(<DocumentUploadZone maxSizeBytes={10 * 1024 * 1024} />);

      const fileInput = screen.getByTestId('file-input');
      // Create simulated 15MB file
      const bigFile = new File([new ArrayBuffer(15 * 1024 * 1024)], 'giant_scan.pdf', {
        type: 'application/pdf',
      });

      fireEvent.change(fileInput, { target: { files: [bigFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('upload-error-alert')).toBeInTheDocument();
        expect(screen.getByText(/File is too large/i)).toBeInTheDocument();
      });
    });

    it('accepts valid PDF file and transitions through upload & extraction states', async () => {
      const onDocumentExtracted = vi.fn();
      render(<DocumentUploadZone onDocumentExtracted={onDocumentExtracted} />);

      const fileInput = screen.getByTestId('file-input');
      const validPdf = new File(['%PDF-1.4 dummy content'], 'Blood_Test_Report.pdf', {
        type: 'application/pdf',
      });

      fireEvent.change(fileInput, { target: { files: [validPdf] } });

      // Should add to list immediately
      expect(screen.getByText('Blood_Test_Report.pdf')).toBeInTheDocument();

      // Should transition to extracted after OCR simulation
      await waitFor(
        () => {
          expect(onDocumentExtracted).toHaveBeenCalled();
        },
        { timeout: 2500 }
      );
    });

    it('removes a document when delete button is clicked', () => {
      render(
        <DocumentUploadZone
          initialDocuments={[
            {
              id: 'doc_to_delete',
              name: 'Temporary_Note.pdf',
              size: 50000,
              type: 'application/pdf',
              status: 'EXTRACTED',
              progress: 100,
              uploadedAt: new Date().toISOString(),
              extractedFactIds: [],
            },
          ]}
        />
      );

      expect(screen.getByText('Temporary_Note.pdf')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('remove-doc-btn-doc_to_delete'));

      expect(screen.queryByText('Temporary_Note.pdf')).not.toBeInTheDocument();
      expect(screen.getByTestId('no-documents-placeholder')).toBeInTheDocument();
    });
  });

  describe('DocumentViewerModal Component', () => {
    const mockDocItem = {
      id: 'doc_synth_rx_01',
      name: 'St. Jude Pharmacy Refill Order.pdf',
      size: 1024 * 1024 * 1.8,
      type: 'application/pdf' as const,
      status: 'EXTRACTED' as const,
      progress: 100,
      uploadedAt: '2026-10-18T08:20:00Z',
      extractedFactIds: ['fact_003'],
    };

    it('renders document metadata and simulated page preview', () => {
      render(
        <DocumentViewerModal
          isOpen={true}
          onClose={vi.fn()}
          document={mockDocItem}
          facts={mockClinicalFacts}
        />
      );

      expect(screen.getByTestId('document-viewer-modal')).toBeInTheDocument();
      expect(screen.getAllByText('St. Jude Pharmacy Refill Order.pdf').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('document-page-preview')).toBeInTheDocument();
      expect(screen.getByText(/Lisinopril 10 MG Oral Tablet/i)).toBeInTheDocument();
    });

    it('displays extracted facts and enforces unverified clinical governance status', () => {
      render(
        <DocumentViewerModal
          isOpen={true}
          onClose={vi.fn()}
          document={mockDocItem}
          facts={mockClinicalFacts}
        />
      );

      // Verify fact is listed with unverified status
      expect(screen.getByTestId('associated-facts-list')).toBeInTheDocument();
      expect(screen.getByText('Extracted (Unverified)')).toBeInTheDocument();
      // Ensure it is NEVER styled as verified
      expect(screen.queryByText('Verified Fact')).not.toBeInTheDocument();
      // Governance warning present
      expect(screen.getByText(/Clinical Governance Rule/i)).toBeInTheDocument();
    });

    it('closes modal when Done Inspecting is clicked', () => {
      const onClose = vi.fn();
      render(
        <DocumentViewerModal
          isOpen={true}
          onClose={onClose}
          document={mockDocItem}
          facts={mockClinicalFacts}
        />
      );

      fireEvent.click(screen.getByTestId('close-viewer-btn'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ClinicalContextLedger Component', () => {
    it('renders ledger facts with concept, value, unit and confidence', () => {
      render(<ClinicalContextLedger facts={mockClinicalFacts} />);

      expect(screen.getByTestId('clinical-context-ledger')).toBeInTheDocument();
      expect(screen.getByText('Chief Complaint')).toBeInTheDocument();
      expect(screen.getByText(/Persistent sharp retrosternal chest tightness/)).toBeInTheDocument();
      expect(screen.getByText('Lisinopril 10mg daily oral')).toBeInTheDocument();
      expect(screen.getByText('(mmHg)')).toBeInTheDocument();
    });

    it('strictly applies provenance and status taxonomy badges without false verification', () => {
      render(<ClinicalContextLedger facts={mockClinicalFacts} />);

      // Patient Reported
      expect(screen.getAllByText('Patient Reported').length).toBeGreaterThanOrEqual(1);
      // Extracted unverified
      expect(screen.getAllByText('Extracted (Unverified Draft)').length).toBeGreaterThanOrEqual(1);
      // Historical EHR
      expect(screen.getAllByText('Historical EHR Record').length).toBeGreaterThanOrEqual(1);
      // Doctor confirmed
      expect(screen.getAllByText('Doctor Confirmed').length).toBeGreaterThanOrEqual(1);
      // Contradiction detected
      expect(screen.getByText('Contradiction Detected')).toBeInTheDocument();

      // Ensure extracted fact is NOT labeled verified
      const unverifiedCard = screen.getByTestId('ledger-fact-card-fact_003');
      expect(unverifiedCard).toHaveTextContent('Extracted (Unverified Draft)');
      expect(unverifiedCard).not.toHaveTextContent('Doctor Confirmed');
    });

    it('filters facts by category dropdown', () => {
      render(<ClinicalContextLedger facts={mockClinicalFacts} />);

      const categorySelect = screen.getByTestId('ledger-category-select');
      fireEvent.change(categorySelect, { target: { value: 'medication' } });

      // Medication should be visible
      expect(screen.getByText('Lisinopril 10mg daily oral')).toBeInTheDocument();
      // Allergy and symptom should be filtered out
      expect(screen.queryByText('Penicillin (Severe hives/anaphylactoid reaction)')).not.toBeInTheDocument();
      expect(screen.queryByText(/Persistent sharp retrosternal chest tightness/)).not.toBeInTheDocument();
    });

    it('filters facts by search keyword query', () => {
      render(<ClinicalContextLedger facts={mockClinicalFacts} />);

      const searchInput = screen.getByTestId('ledger-search-input');
      fireEvent.change(searchInput, { target: { value: 'Penicillin' } });

      expect(screen.getByText(/Penicillin/i)).toBeInTheDocument();
      expect(screen.queryByText('Lisinopril 10mg daily oral')).not.toBeInTheDocument();
    });

    it('displays evidence quote callouts and triggers citation inspection', () => {
      const onSelectCitation = vi.fn();
      render(
        <ClinicalContextLedger
          facts={mockClinicalFacts}
          onSelectCitation={onSelectCitation}
        />
      );

      expect(screen.getByTestId('citation-callout-fact_001')).toBeInTheDocument();
      expect(screen.getByText(/tight squeezing feeling right in the middle/i)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('jump-citation-btn-fact_001'));
      expect(onSelectCitation).toHaveBeenCalledWith('fact_001');
    });

    it('renders empty state when search matches nothing', () => {
      render(<ClinicalContextLedger facts={mockClinicalFacts} />);

      const searchInput = screen.getByTestId('ledger-search-input');
      fireEvent.change(searchInput, { target: { value: 'NonexistentConditionXYZ' } });

      expect(screen.getByTestId('ledger-empty-state')).toBeInTheDocument();
      expect(screen.getByText(/No matching clinical facts found/i)).toBeInTheDocument();
    });
  });

  describe('ContextDiffView Component', () => {
    it('renders new facts, changed facts and unresolved contradictions', () => {
      render(<ContextDiffView />);

      expect(screen.getByTestId('context-diff-view')).toBeInTheDocument();
      // Contradictions section
      expect(screen.getByTestId('unresolved-conflicts-section')).toBeInTheDocument();
      expect(screen.getByText(/Unresolved Clinical Contradictions/i)).toBeInTheDocument();
      // Changed facts section
      expect(screen.getByTestId('changed-facts-section')).toBeInTheDocument();
      expect(screen.getByText(/Changed \/ Superseded Facts/i)).toBeInTheDocument();
      expect(screen.getByText(/130\/80/)).toBeInTheDocument();
      expect(screen.getByText(/142\/88/)).toBeInTheDocument();
      // New facts section
      expect(screen.getByTestId('new-facts-section')).toBeInTheDocument();
      expect(screen.getByText(/Newly Introduced Facts/i)).toBeInTheDocument();
    });

    it('displays side-by-side comparison for conflicting claims', () => {
      render(<ContextDiffView />);

      expect(screen.getByTestId('conflict-card-0')).toBeInTheDocument();
      expect(screen.getByText(/Claim A \(Current Patient Intake\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Claim B \(Referral Note \/ Prior EHR\)/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Contradictory onset timeline between patient intake statement/i)
      ).toBeInTheDocument();
    });

    it('resolves contradiction and updates resolution badge on action click', () => {
      const onResolve = vi.fn();
      render(<ContextDiffView onResolveConflict={onResolve} />);

      // Click "Accept Patient Statement"
      fireEvent.click(screen.getByTestId('resolve-patient-btn-0'));

      expect(onResolve).toHaveBeenCalledWith(0, 'accept_a');
      expect(screen.getByText('Patient Claim Kept')).toBeInTheDocument();
      expect(screen.getByText('All Reconciled')).toBeInTheDocument();
    });
  });

  describe('LedgerDiffHub Full Integration', () => {
    it('renders hub header and toggles between sub-tabs', () => {
      render(<LedgerDiffHub />);

      expect(screen.getByTestId('ledger-diff-hub')).toBeInTheDocument();
      expect(screen.getByText('Clinical Context Ledger & Patient Context Diff')).toBeInTheDocument();
      expect(screen.getByText('G3 Workstream')).toBeInTheDocument();

      // Click Document Upload tab
      fireEvent.click(screen.getByRole('button', { name: /Document Upload/i }));
      expect(screen.getByTestId('document-upload-zone')).toBeInTheDocument();
      expect(screen.queryByTestId('clinical-context-ledger')).not.toBeInTheDocument();

      // Click Context Ledger tab
      fireEvent.click(screen.getByRole('button', { name: /Context Ledger/i }));
      expect(screen.getByTestId('clinical-context-ledger')).toBeInTheDocument();
      expect(screen.queryByTestId('document-upload-zone')).not.toBeInTheDocument();

      // Click Context Diff tab
      fireEvent.click(screen.getByRole('button', { name: /Context Diff/i }));
      expect(screen.getByTestId('context-diff-view')).toBeInTheDocument();
      expect(screen.queryByTestId('clinical-context-ledger')).not.toBeInTheDocument();
    });

    it('opens DocumentViewerModal when View Source is clicked from upload zone', () => {
      render(<LedgerDiffHub />);

      const inspectBtn = screen.getByTestId('inspect-doc-btn-doc_synth_rx_01');
      fireEvent.click(inspectBtn);

      expect(screen.getByTestId('document-viewer-modal')).toBeInTheDocument();
    });
  });
});

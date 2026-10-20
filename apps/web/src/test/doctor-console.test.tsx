import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DoctorQueueList } from '../features/doctor-dashboard/DoctorQueueList';
import { DoctorBriefCard } from '../features/doctor-brief/DoctorBriefCard';
import { AudioBriefPlayer } from '../features/doctor-brief/AudioBriefPlayer';
import { DoctorApprovalModal } from '../features/doctor-brief/DoctorApprovalModal';
import { DoctorDashboardHub } from '../features/doctor-dashboard/DoctorDashboardHub';
import { mockDoctorQueue, mockClinicalFacts, mockCitations } from '../lib/api/mockData';
import { mockApi } from '../lib/api/mockAdapter';

describe('TASK-P1-501: Doctor Console, Briefing UI & Audio Player Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. DOCTOR QUEUE LIST
  describe('1. DoctorQueueList Component', () => {
    it('renders queue items with patient names, priorities, and statuses', () => {
      const handleSelect = vi.fn();
      render(
        <DoctorQueueList
          queue={mockDoctorQueue}
          selectedEncounterId="enc_demo_001"
          onSelectPatient={handleSelect}
        />
      );

      expect(screen.getByText("Patient Triage Queue")).toBeInTheDocument();
      expect(screen.getByText('Eleanor Johnson')).toBeInTheDocument();
      expect(screen.getByText('Marcus Patel')).toBeInTheDocument();
      expect(screen.getByText('Elevated')).toBeInTheDocument();
      expect(screen.getByText('Routine')).toBeInTheDocument();
    });

    it('highlights the selected active patient and invokes onSelectPatient', () => {
      const handleSelect = vi.fn();
      render(
        <DoctorQueueList
          queue={mockDoctorQueue}
          selectedEncounterId="enc_demo_001"
          onSelectPatient={handleSelect}
        />
      );

      expect(screen.getByText('Currently Active in Console')).toBeInTheDocument();

      const secondPatient = screen.getByTestId('queue-item-enc_demo_002');
      fireEvent.click(secondPatient);
      expect(handleSelect).toHaveBeenCalledWith(
        expect.objectContaining({ encounter_id: 'enc_demo_002' })
      );
    });

    it('filters queue items by priority', () => {
      render(
        <DoctorQueueList
          queue={mockDoctorQueue}
          selectedEncounterId="enc_demo_001"
          onSelectPatient={vi.fn()}
        />
      );

      const elevatedBtn = screen.getByTestId('filter-priority-ELEVATED');
      fireEvent.click(elevatedBtn);

      expect(screen.getByText('Eleanor Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Marcus Patel')).not.toBeInTheDocument();
    });

    it('filters queue items by search text', () => {
      render(
        <DoctorQueueList
          queue={mockDoctorQueue}
          selectedEncounterId="enc_demo_001"
          onSelectPatient={vi.fn()}
        />
      );

      const searchInput = screen.getByTestId('queue-search-input');
      fireEvent.change(searchInput, { target: { value: 'Marcus' } });

      expect(screen.getByText('Marcus Patel')).toBeInTheDocument();
      expect(screen.queryByText('Eleanor Johnson')).not.toBeInTheDocument();
    });

    it('renders empty state when search finds no matches', () => {
      render(
        <DoctorQueueList
          queue={mockDoctorQueue}
          selectedEncounterId="enc_demo_001"
          onSelectPatient={vi.fn()}
        />
      );

      const searchInput = screen.getByTestId('queue-search-input');
      fireEvent.change(searchInput, { target: { value: 'Nonexistent Patient XYZ' } });

      expect(screen.getByTestId('queue-empty-state')).toBeInTheDocument();
    });
  });

  // 2. AUDIO BRIEF PLAYER
  describe('2. AudioBriefPlayer Component', () => {
    it('renders waveform visualizer, time indicators, and play button', () => {
      render(
        <AudioBriefPlayer
          transcriptText="44-year-old female presenting with 3 days of retrosternal chest tightness."
          durationSeconds={60}
          patientName="Eleanor Johnson"
        />
      );

      expect(screen.getByTestId('audio-brief-player')).toBeInTheDocument();
      expect(screen.getByText('AI Synthesized Audio Brief')).toBeInTheDocument();
      expect(screen.getByTestId('audio-play-pause-btn')).toBeInTheDocument();
      expect(screen.getByText('1x')).toBeInTheDocument();
    });

    it('toggles playback on play/pause click', () => {
      render(
        <AudioBriefPlayer
          transcriptText="Clinical summary test"
          durationSeconds={60}
        />
      );

      const playBtn = screen.getByTestId('audio-play-pause-btn');
      expect(playBtn).toHaveAttribute('aria-label', 'Play audio brief');

      fireEvent.click(playBtn);
      expect(playBtn).toHaveAttribute('aria-label', 'Pause audio brief');

      fireEvent.click(playBtn);
      expect(playBtn).toHaveAttribute('aria-label', 'Play audio brief');
    });

    it('cycles playback speed between 1x, 1.25x, and 1.5x', () => {
      render(
        <AudioBriefPlayer
          transcriptText="Clinical summary test"
        />
      );

      const speedBtn = screen.getByTestId('audio-speed-btn');
      expect(speedBtn).toHaveTextContent('1x');

      fireEvent.click(speedBtn);
      expect(speedBtn).toHaveTextContent('1.25x');

      fireEvent.click(speedBtn);
      expect(speedBtn).toHaveTextContent('1.5x');

      fireEvent.click(speedBtn);
      expect(speedBtn).toHaveTextContent('1x');
    });

    it('guarantees text fallback transcript is visible and toggleable', () => {
      render(
        <AudioBriefPlayer
          transcriptText="Guaranteed textual summary for doctor reading."
        />
      );

      expect(screen.getByTestId('audio-transcript-fallback')).toBeInTheDocument();
      expect(
        screen.getByText('"Guaranteed textual summary for doctor reading."')
      ).toBeInTheDocument();

      const toggleBtn = screen.getByTestId('toggle-transcript-btn');
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId('audio-transcript-fallback')).not.toBeInTheDocument();

      fireEvent.click(toggleBtn);
      expect(screen.getByTestId('audio-transcript-fallback')).toBeInTheDocument();
    });

    it('supports keyboard scrubbing controls on the progress bar', () => {
      render(
        <AudioBriefPlayer
          transcriptText="Keyboard accessibility test"
          durationSeconds={60}
        />
      );

      const progressbar = screen.getByTestId('audio-progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');

      // ArrowRight increases by 5 seconds
      fireEvent.keyDown(progressbar, { key: 'ArrowRight' });
      expect(progressbar).toHaveAttribute('aria-valuenow', '5');

      // ArrowUp increases by 5 seconds
      fireEvent.keyDown(progressbar, { key: 'ArrowUp' });
      expect(progressbar).toHaveAttribute('aria-valuenow', '10');

      // ArrowLeft decreases by 5 seconds
      fireEvent.keyDown(progressbar, { key: 'ArrowLeft' });
      expect(progressbar).toHaveAttribute('aria-valuenow', '5');

      // End sets to durationSeconds
      fireEvent.keyDown(progressbar, { key: 'End' });
      expect(progressbar).toHaveAttribute('aria-valuenow', '60');

      // Home resets to 0
      fireEvent.keyDown(progressbar, { key: 'Home' });
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    });

    it('shows error notice when audio synthesis is unavailable', () => {
      render(
        <AudioBriefPlayer
          transcriptText="Audio unavailable test"
          isAvailable={false}
        />
      );

      const playBtn = screen.getByTestId('audio-play-pause-btn');
      fireEvent.click(playBtn);

      expect(screen.getByTestId('audio-error-notice')).toBeInTheDocument();
    });
  });

  // 3. DOCTOR APPROVAL MODAL
  describe('3. DoctorApprovalModal Component', () => {
    it('renders approval dialog and submits sign-off', async () => {
      const handleApproval = vi.fn();
      const handleClose = vi.fn();

      render(
        <DoctorApprovalModal
          isOpen={true}
          onClose={handleClose}
          encounterId="enc_demo_001"
          patientName="Eleanor Johnson"
          facts={mockClinicalFacts}
          onApprovalRecorded={handleApproval}
        />
      );

      expect(
        screen.getByText('Clinical Review Sign-off & Encounter Approval')
      ).toBeInTheDocument();
      expect(screen.getByText('Approve & Sign')).toBeInTheDocument();

      const submitBtn = screen.getByTestId('submit-approval-btn');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleApproval).toHaveBeenCalledWith(
          expect.objectContaining({
            encounter_id: 'enc_demo_001',
            status: 'RECORDED',
          })
        );
      });
      expect(handleClose).toHaveBeenCalled();
    });

    it('allows switching decision to CORRECTIONS_NEEDED and selecting facts to flag', () => {
      render(
        <DoctorApprovalModal
          isOpen={true}
          onClose={vi.fn()}
          encounterId="enc_demo_001"
          patientName="Eleanor Johnson"
          facts={mockClinicalFacts}
          onApprovalRecorded={vi.fn()}
        />
      );

      const correctionsBtn = screen.getByTestId('decision-corrections-btn');
      fireEvent.click(correctionsBtn);

      expect(
        screen.getByText('Select Facts Requiring Physician Amendment:')
      ).toBeInTheDocument();

      const factItem = screen.getByTestId('correction-fact-fact_001');
      fireEvent.click(factItem);
      expect(factItem.className).toContain('border-amber-500');
    });
  });

  // 4. DOCTOR BRIEF CARD
  describe('4. DoctorBriefCard Component', () => {
    const sampleBrief = {
      encounter_id: 'enc_demo_001',
      patient_name: 'Eleanor Johnson (44F)',
      chief_complaint: 'Subacute retrosternal chest tightness with hypertensive trend',
      clinical_summary: '44-year-old female presenting with 3 days of retrosternal chest tightness.',
      citations: mockCitations,
      unresolved_questions: [
        'Verify true symptom duration (3 days vs 2 weeks).',
        'Confirm last dose of Lisinopril.',
      ],
      audio_brief_available: true,
      audio_brief_url: '/audio.mp3',
    };

    it('renders chief complaint, clinical summary, and evidence citations', () => {
      render(
        <DoctorBriefCard
          brief={sampleBrief}
          encounterId="enc_demo_001"
          patientName="Eleanor Johnson"
          facts={mockClinicalFacts}
        />
      );

      expect(screen.getByText(/Subacute retrosternal chest tightness/)).toBeInTheDocument();
      expect(screen.getByText(sampleBrief.clinical_summary)).toBeInTheDocument();
      expect(screen.getByTestId('citation-card-cite_01')).toBeInTheDocument();
      expect(screen.getByTestId('citation-card-cite_02')).toBeInTheDocument();
    });

    it('invokes onSelectCitation when a citation card is clicked', () => {
      const handleSelectCitation = vi.fn();
      render(
        <DoctorBriefCard
          brief={sampleBrief}
          encounterId="enc_demo_001"
          patientName="Eleanor Johnson"
          facts={mockClinicalFacts}
          onSelectCitation={handleSelectCitation}
        />
      );

      const citeCard = screen.getByTestId('citation-card-cite_01');
      fireEvent.click(citeCard);

      expect(handleSelectCitation).toHaveBeenCalledWith(
        expect.objectContaining({ citation_id: 'cite_01' })
      );
    });

    it('renders unresolved questions and contradiction warning callout without hiding uncertainty', () => {
      render(
        <DoctorBriefCard
          brief={sampleBrief}
          encounterId="enc_demo_001"
          patientName="Eleanor Johnson"
          facts={mockClinicalFacts}
        />
      );

      expect(screen.getByTestId('unresolved-questions-box')).toBeInTheDocument();
      expect(
        screen.getByText('Verify true symptom duration (3 days vs 2 weeks).')
      ).toBeInTheDocument();
      expect(screen.getByTestId('brief-contradiction-alert')).toBeInTheDocument();
    });

    it('opens DoctorApprovalModal when clicking Review & Sign Off', () => {
      render(
        <DoctorBriefCard
          brief={sampleBrief}
          encounterId="enc_demo_001"
          patientName="Eleanor Johnson"
          facts={mockClinicalFacts}
        />
      );

      const signOffBtn = screen.getByTestId('open-signoff-modal-btn');
      fireEvent.click(signOffBtn);

      expect(
        screen.getByText('Clinical Review Sign-off & Encounter Approval')
      ).toBeInTheDocument();
    });

    it('triggers onRegenerateBrief callback when Regenerate Brief button is clicked', () => {
      const handleRegenerate = vi.fn();
      render(
        <DoctorBriefCard
          brief={sampleBrief}
          encounterId="enc_demo_001"
          patientName="Eleanor Johnson"
          facts={mockClinicalFacts}
          onRegenerateBrief={handleRegenerate}
        />
      );

      const regenBtn = screen.getByTestId('regenerate-brief-btn');
      expect(regenBtn).toBeInTheDocument();
      fireEvent.click(regenBtn);
      expect(handleRegenerate).toHaveBeenCalledTimes(1);
    });
  });

  // 5. DOCTOR DASHBOARD HUB FULL INTEGRATION
  describe('5. DoctorDashboardHub Full Integration', () => {
    it('loads doctor queue and active brief data on mount', async () => {
      render(<DoctorDashboardHub />);

      // Verify active consultation header banner
      await waitFor(() => {
        expect(screen.getByText('Active Consultation Case')).toBeInTheDocument();
        expect(screen.getByText('Eleanor Johnson')).toBeInTheDocument();
      });

      // Verify brief rendered
      expect(screen.getByText('Evidence Brief & Audio')).toBeInTheDocument();
      expect(screen.getByTestId('doctor-brief-card')).toBeInTheDocument();
    });

    it('switches between patients from the triage queue and updates clinical brief', async () => {
      render(<DoctorDashboardHub />);

      await waitFor(() => {
        expect(screen.getByText('Marcus Patel')).toBeInTheDocument();
      });

      // Initially Eleanor is selected
      expect(screen.getByText('Eleanor Johnson (44F) — Clinical Brief')).toBeInTheDocument();

      const secondQueueItem = screen.getByTestId('queue-item-enc_demo_002');
      fireEvent.click(secondQueueItem);

      await waitFor(() => {
        expect(screen.getByText('Marcus Patel (52M) — Clinical Brief')).toBeInTheDocument();
        expect(screen.getByText('Routine 6-month lipid review with stable baseline ECG')).toBeInTheDocument();
      });
    });

    it('resets approval success banner when switching patients after an approval', async () => {
      render(<DoctorDashboardHub />);

      await waitFor(() => {
        expect(screen.getByTestId('open-signoff-modal-btn')).toBeInTheDocument();
      });

      // Sign off for Eleanor
      fireEvent.click(screen.getByTestId('open-signoff-modal-btn'));
      fireEvent.click(screen.getByTestId('submit-approval-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('approval-success-banner')).toBeInTheDocument();
      });

      // Switch to Marcus Patel
      const secondQueueItem = screen.getByTestId('queue-item-enc_demo_002');
      fireEvent.click(secondQueueItem);

      await waitFor(() => {
        expect(screen.getByText('Marcus Patel (52M) — Clinical Brief')).toBeInTheDocument();
        // The previous patient's approval banner must be gone
        expect(screen.queryByTestId('approval-success-banner')).not.toBeInTheDocument();
      });
    });

    it('switches tabs to Context Ledger, Context Diff, and Documents', async () => {
      render(<DoctorDashboardHub />);

      await waitFor(() => {
        expect(screen.getByTestId('doc-tab-ledger')).toBeInTheDocument();
      });

      // Tab 2: Context Ledger
      fireEvent.click(screen.getByTestId('doc-tab-ledger'));
      expect(screen.getByTestId('tab-content-ledger')).toBeInTheDocument();

      // Tab 3: Context Diff
      fireEvent.click(screen.getByTestId('doc-tab-diff'));
      expect(screen.getByTestId('tab-content-diff')).toBeInTheDocument();

      // Tab 4: Patient Profile (Diagnostic Documents removed to eliminate redundancy with Clinical Ledger)
      expect(screen.queryByTestId('doc-tab-documents')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('doc-tab-profile'));
      expect(screen.getByTestId('tab-content-profile')).toBeInTheDocument();
    });

    it('opens document viewer modal when citation is clicked', async () => {
      render(<DoctorDashboardHub />);

      await waitFor(() => {
        expect(screen.getByTestId('citation-card-cite_01')).toBeInTheDocument();
      });

      const citeCard = screen.getByTestId('citation-card-cite_01');
      fireEvent.click(citeCard);

      await waitFor(() => {
        expect(screen.getByTestId('document-viewer-modal')).toBeInTheDocument();
      });
    });

    it('records doctor approval and updates patient status in queue', async () => {
      render(<DoctorDashboardHub />);

      await waitFor(() => {
        expect(screen.getByTestId('open-signoff-modal-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('open-signoff-modal-btn'));

      const commitBtn = screen.getByTestId('submit-approval-btn');
      fireEvent.click(commitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('approval-success-banner')).toBeInTheDocument();
        expect(screen.getByText('Signed Off')).toBeInTheDocument();
      });
    });

    it('handles queue load failure with retry button', async () => {
      vi.spyOn(mockApi, 'getDoctorQueue').mockRejectedValueOnce(new Error('Network Gateway Timeout'));

      render(<DoctorDashboardHub />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load queue')).toBeInTheDocument();
        expect(screen.getByText('Retry Queue')).toBeInTheDocument();
      });
    });
  });
});

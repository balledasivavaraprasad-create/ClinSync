/**
 * Agent Memory Harness conforming to Mem0 conventions for the patient intake kiosk.
 *
 * Persists episodic memory across conversational turns, retains self-corrections,
 * negated/affirmed facts, and synthesizes dynamic follow-up questions based on all
 * previous inputs and outputs.
 */

export interface MemoryEntry {
  id: string;
  turnIndex: number;
  role: 'patient' | 'assistant';
  content: string;
  concept: string;
  negated?: boolean;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface GeneratedQuestionContext {
  prompt: string;
  subtitle: string;
  recommendedChips: string[];
}

export class AgentMemoryHarness {
  private memories: MemoryEntry[] = [];

  /**
   * Add a turn memory into episodic memory.
   */
  public record(
    turnIndex: number,
    role: 'patient' | 'assistant',
    content: string,
    concept: string,
    negated: boolean = false,
    metadata?: Record<string, unknown>
  ): MemoryEntry {
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      turnIndex,
      role,
      content: content.trim(),
      concept,
      negated,
      metadata,
      timestamp: new Date().toISOString(),
    };
    this.memories.push(entry);
    return entry;
  }

  /**
   * Retrieve all memories for the current session.
   */
  public getAll(): MemoryEntry[] {
    return [...this.memories];
  }

  /**
   * Retrieve the primary chief complaint, if recorded.
   */
  public getChiefComplaint(): { value: string; ruledOut: string[] } | null {
    const cc = this.memories
      .filter((m) => m.concept === 'chief_complaint' && !m.negated)
      .slice(-1)[0];
    const ruledOut = this.memories
      .filter((m) => m.concept === 'ruled_out_symptom' || m.negated)
      .map((m) => m.content);

    if (!cc) return null;
    return {
      value: cc.content,
      ruledOut,
    };
  }

  /**
   * Retrieve duration, if recorded.
   */
  public getDuration(): string | null {
    const dur = this.memories
      .filter((m) => m.concept === 'duration' && !m.negated)
      .slice(-1)[0];
    return dur ? dur.content : null;
  }

  /**
   * Generate an intelligent follow-up question based on ALL prior inputs & memory.
   */
  public generateFollowUpQuestion(
    _stepIndex: number,
    fieldKey: string,
    defaultPrompt: string,
    defaultSubtitle: string,
    defaultChips: string[]
  ): GeneratedQuestionContext {
    const ccInfo = this.getChiefComplaint();
    const chiefComplaint = ccInfo?.value;
    const ruledOutStr =
      ccInfo?.ruledOut && ccInfo.ruledOut.length > 0
        ? ` (with ${ccInfo.ruledOut.join(', ')} explicitly ruled out)`
        : '';
    const duration = this.getDuration();

    // Step 2: Duration & Timeline
    if (fieldKey === 'duration' && chiefComplaint) {
      return {
        prompt: `Thank you for sharing that. How long have you been experiencing this ${chiefComplaint}${ruledOutStr}, and did it start suddenly or develop gradually over several days?`,
        subtitle: `Knowing when your ${chiefComplaint} began helps our triage doctor evaluate urgency.`,
        recommendedChips: [
          'Just started this morning',
          'About 2 to 3 days',
          'Approximately 1 week',
          'More than 2 weeks',
        ],
      };
    }

    // Step 3: Severity Score
    if (fieldKey === 'severity' && chiefComplaint) {
      return {
        prompt: `On a scale from 0 to 10, where 0 is pain-free and 10 is the worst pain imaginable, how severe would you rate your ${chiefComplaint} right now?`,
        subtitle: `Rating your ${chiefComplaint} severity allows the physician to prepare appropriate pain management.`,
        recommendedChips: ['0 - None', '3 - Mild', '5 - Moderate', '8 - Severe', '10 - Worst'],
      };
    }

    // Step 4: Associated Symptoms
    if (fieldKey === 'associated_symptoms' && chiefComplaint) {
      const durMention = duration ? ` for ${duration}` : '';
      const lower = chiefComplaint.toLowerCase();

      let tailoredChips: string[];
      let promptMention = '';

      if (lower.includes('chest') || lower.includes('heart') || lower.includes('pressure')) {
        tailoredChips = [
          'Shortness of breath on exertion',
          'Dizziness / lightheadedness',
          'Cold sweats or nausea',
          'Palpitations / racing pulse',
          'No other symptoms',
        ];
        promptMention = 'such as shortness of breath, dizziness, or cold sweats';
      } else if (lower.includes('cough') || lower.includes('wheez') || lower.includes('throat')) {
        tailoredChips = [
          'Sore throat & hoarseness',
          'Nasal congestion & runny nose',
          'Chills or mild body aches',
          'Shortness of breath',
          'No other symptoms',
        ];
        promptMention = 'such as sore throat, nasal congestion, or chills';
      } else if (lower.includes('body ache') || lower.includes('joint') || lower.includes('muscle')) {
        tailoredChips = [
          'Joint stiffness / swelling',
          'Headache or fatigue',
          'Muscle weakness',
          'Reduced mobility',
          'No other symptoms',
        ];
        promptMention = 'such as joint stiffness, headache, or unusual fatigue';
      } else {
        tailoredChips = defaultChips;
        promptMention = 'such as nausea, headache, or unusual fatigue';
      }

      return {
        prompt: `Earlier you mentioned having ${chiefComplaint}${durMention}. Are you experiencing any other accompanying symptoms today, ${promptMention}?`,
        subtitle: `Connecting other signs with your ${chiefComplaint} helps identify potential underlying causes.`,
        recommendedChips: tailoredChips,
      };
    }

    // Step 5: Medications & Allergies
    if (fieldKey === 'medications_allergies' && chiefComplaint) {
      return {
        prompt: `Lastly, to ensure your safety when our clinical team treats your ${chiefComplaint}, do you take any regular prescription medications, or do you have any known allergies, especially to antibiotics like penicillin?`,
        subtitle: `This ensures safe treatment planning and avoids adverse medication interactions.`,
        recommendedChips: [
          'Blood pressure medication',
          'Pain relievers (NSAIDs / Tylenol)',
          'Penicillin allergy',
          'Over-the-counter vitamins only',
          'No medications or allergies',
        ],
      };
    }

    // Default fallback
    return {
      prompt: defaultPrompt,
      subtitle: defaultSubtitle,
      recommendedChips: defaultChips,
    };
  }

  /**
   * Reset session memory.
   */
  public clear(): void {
    this.memories = [];
  }
}

import { describe, it, expect } from 'vitest';
import { AgentMemoryHarness } from '../lib/clinical/agentMemory';

describe('AgentMemoryHarness (Mem0 Client Integration)', () => {
  it('records episodic memory turns and retrieves chief complaint', () => {
    const memory = new AgentMemoryHarness();

    memory.record(1, 'patient', 'Severe migraine with dizziness', 'chief_complaint');
    const cc = memory.getChiefComplaint();

    expect(cc).not.toBeNull();
    expect(cc?.value).toBe('Severe migraine with dizziness');
    expect(cc?.ruledOut).toHaveLength(0);
  });

  it('records negated symptoms from self-correction as ruled out', () => {
    const memory = new AgentMemoryHarness();

    memory.record(1, 'patient', 'Body ache', 'chief_complaint');
    memory.record(1, 'patient', 'fever', 'ruled_out_symptom', true);

    const cc = memory.getChiefComplaint();
    expect(cc?.value).toBe('Body ache');
    expect(cc?.ruledOut).toContain('fever');
  });

  it('synthesizes dynamic follow-up questions tailored to prior memory answers', () => {
    const memory = new AgentMemoryHarness();

    // Turn 1: Patient reports chest discomfort
    memory.record(1, 'patient', 'Chest tightness / pressure', 'chief_complaint');

    // Turn 2 question generation
    const q2 = memory.generateFollowUpQuestion(
      1,
      'duration',
      'How long have you had this?',
      'Timeline',
      ['1 day', '2 days']
    );

    expect(q2.prompt).toContain('Chest tightness / pressure');
    expect(q2.subtitle).toContain('Chest tightness / pressure');

    // Turn 2: Patient reports duration
    memory.record(2, 'patient', 'Approximately 1 week', 'duration');

    // Turn 4 question generation (Associated symptoms)
    const q4 = memory.generateFollowUpQuestion(
      3,
      'associated_symptoms',
      'Are you experiencing other symptoms?',
      'Other symptoms',
      ['none']
    );

    expect(q4.prompt).toContain('Chest tightness / pressure');
    expect(q4.prompt).toContain('Approximately 1 week');
    expect(q4.recommendedChips).toContain('Shortness of breath on exertion');
  });

  it('clears memory on session reset', () => {
    const memory = new AgentMemoryHarness();
    memory.record(1, 'patient', 'Cough', 'chief_complaint');
    expect(memory.getAll()).toHaveLength(1);

    memory.clear();
    expect(memory.getAll()).toHaveLength(0);
  });
});

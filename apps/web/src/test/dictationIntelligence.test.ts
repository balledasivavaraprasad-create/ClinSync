import { describe, it, expect } from 'vitest';
import {
  distillClinicalDictation,
  stripConversationalFillers,
} from '../lib/clinical/dictationIntelligence';

describe('Clinical Dictation Intelligence', () => {
  it('correctly resolves negation and self-correction: "not the fever, its the body ache"', () => {
    const rawSpeech = "Um, to be honest doctor, it's not the fever that I have, it's the body ache I have.";
    const result = distillClinicalDictation(rawSpeech, 'Chief Complaint', [
      'Joint & muscle aches',
      'Persistent dry cough',
      'Mild fever & chills',
    ]);

    expect(result.correctionDetected).toBe(true);
    expect(result.negatedEntities).toContain('fever');
    expect(result.affirmedEntities).toContain('body ache');
    expect(result.distilledAnswer).toContain('Body ache');
    expect(result.distilledAnswer).toContain('fever');
    expect(result.matchedChip).toBe('Joint & muscle aches');
  });

  it('correctly resolves timeline correction: "3 days... no wait, 1 week"', () => {
    const rawSpeech = 'I have felt this for about 3 days, no wait, actually 1 week.';
    const result = distillClinicalDictation(rawSpeech, 'Duration', [
      'Just started this morning',
      'About 2 to 3 days',
      'Approximately 1 week',
      'More than 2 weeks',
    ]);

    expect(result.correctionDetected).toBe(true);
    expect(result.negatedEntities).toContain('3 days');
    expect(result.affirmedEntities).toContain('1 week');
    expect(result.distilledAnswer).toContain('1 week');
  });

  it('cleans conversational rambling and fillers from straightforward symptom statements', () => {
    const rawSpeech = 'Well basically you know I have persistent dry cough since yesterday morning.';
    const cleaned = stripConversationalFillers(rawSpeech);
    expect(cleaned.toLowerCase()).toContain('persistent dry cough');
    expect(cleaned).not.toMatch(/^well/i);

    const result = distillClinicalDictation(rawSpeech, 'Chief Complaint', [
      'Persistent dry cough',
      'Chest tightness / pain',
    ]);
    expect(result.matchedChip).toBe('Persistent dry cough');
  });

  it('handles empty input gracefully', () => {
    const result = distillClinicalDictation('');
    expect(result.distilledAnswer).toBe('');
    expect(result.correctionDetected).toBe(false);
  });
});

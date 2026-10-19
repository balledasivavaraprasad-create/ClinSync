/**
 * Clinical Dictation Intelligence Engine
 * Distills rambling patient speech, resolves negations & self-corrections,
 * and extracts structured clinical entities.
 */

export interface ClinicalDictationResult {
  verbatimTranscript: string;
  distilledAnswer: string;
  negatedEntities: string[];
  affirmedEntities: string[];
  correctionDetected: boolean;
  correctionExplanation?: string;
  clinicalCategory?: string;
  confidenceScore: number;
  matchedChip?: string;
}

// Common conversational filler phrases in patient speech
const FILLER_PATTERNS = [
  /^(?:well|um|uh|you know|honestly|to be honest|basically|so yeah|like|i guess|right now|i mean)\b[\s,]*/gi,
  /\b(?:you know|to be completely honest|i think|if that makes sense|or something like that|and all that)\b/gi,
  /\b(?:right now i just ramble|i was just rambling|as i was saying)\b[\s,]*/gi,
];

// Clean filler phrases while preserving clinical meaning
export function stripConversationalFillers(text: string): string {
  let cleaned = text.trim();
  for (const pattern of FILLER_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Distills raw patient rambling into an intelligent clinical finding.
 * Detects self-corrections like "it's not the fever that I have, it's the body ache I have".
 */
export function distillClinicalDictation(
  rawTranscript: string,
  category?: string,
  quickChips: string[] = []
): ClinicalDictationResult {
  const verbatim = rawTranscript.trim();
  if (!verbatim) {
    return {
      verbatimTranscript: '',
      distilledAnswer: '',
      negatedEntities: [],
      affirmedEntities: [],
      correctionDetected: false,
      confidenceScore: 0,
    };
  }

  const negatedEntities: string[] = [];
  const affirmedEntities: string[] = [];
  let correctionDetected = false;
  let correctionExplanation: string | undefined;

  // 1. Detect explicit negation & self-correction patterns
  // Pattern A: "It's not (the) X (that I have), it's (the) Y (that I have)"
  const notXItsYPattern =
    /(?:it'?s\s+not|not|don'?t\s+have|never\s+had|wasn'?t)\s+(?:the\s+)?([a-z\s]+?)(?:,\s*|\s+)?(?:that\s+i\s+have|i\s+have|at\s+all)?(?:,\s*|\s+)?(?:it'?s|actually|instead|rather|but|more\s+like|i\s+mean)\s+(?:the\s+)?([a-z0-9\s/]+?)(?:that\s+i\s+have|\s+i\s+have|[.,]|$)/i;

  const matchA = verbatim.match(notXItsYPattern);
  if (matchA) {
    const rawNegated = matchA[1].trim();
    const rawAffirmed = matchA[2].trim();
    if (rawNegated && rawAffirmed) {
      negatedEntities.push(rawNegated);
      affirmedEntities.push(rawAffirmed);
      correctionDetected = true;
      correctionExplanation = `Patient self-corrected: excluded "${rawNegated}" in favor of "${rawAffirmed}".`;
    }
  }

  // Pattern B: Timeline correction: "X days... no wait / scratch that / actually Y weeks"
  const timelineCorrectionPattern =
    /(\b\d+\s*(?:days?|weeks?|months?|hours?)\b)[\s,]*(?:no\s+wait|scratch\s+that|actually|more\s+like|rather|wait|no)[\s,\w]*(?:actually\s+)?(\b\d+\s*(?:days?|weeks?|months?|hours?)\b)/i;
  const matchB = verbatim.match(timelineCorrectionPattern);
  if (matchB) {
    const oldTime = matchB[1].trim();
    const newTime = matchB[2].trim();
    negatedEntities.push(oldTime);
    affirmedEntities.push(newTime);
    correctionDetected = true;
    correctionExplanation = `Patient revised duration from "${oldTime}" to "${newTime}".`;
  }

  // Pattern C: "No X, only Y" / "Not X, but Y"
  if (!correctionDetected) {
    const notXButY = /\bnot\s+([a-z\s]+?)\s*,\s*(?:but|only)\s+([a-z\s]+)\b/i;
    const matchC = verbatim.match(notXButY);
    if (matchC) {
      const rawNegated = matchC[1].trim();
      const rawAffirmed = matchC[2].trim();
      negatedEntities.push(rawNegated);
      affirmedEntities.push(rawAffirmed);
      correctionDetected = true;
      correctionExplanation = `Patient specified: "${rawAffirmed}" (not "${rawNegated}").`;
    }
  }

  // 2. Synthesize distilled answer
  let distilledAnswer = '';

  if (affirmedEntities.length > 0) {
    const primary = affirmedEntities[0];
    // Capitalize first letter
    const formattedPrimary = primary.charAt(0).toUpperCase() + primary.slice(1);
    if (negatedEntities.length > 0) {
      distilledAnswer = `${formattedPrimary} (explicitly ruled out: ${negatedEntities.join(', ')})`;
    } else {
      distilledAnswer = formattedPrimary;
    }
  } else {
    // If no correction pattern matched, clean up fillers
    const cleaned = stripConversationalFillers(verbatim);
    distilledAnswer = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // 3. Chip matching
  let matchedChip: string | undefined;
  const checkText = (affirmedEntities[0] || distilledAnswer).toLowerCase();
  for (const chip of quickChips) {
    const chipLower = chip.toLowerCase();
    // Check direct word containment or common synonyms
    if (checkText.includes(chipLower) || chipLower.includes(checkText)) {
      matchedChip = chip;
      break;
    }
    // Specific clinical concept synonyms
    if (checkText.includes('body ache') || checkText.includes('muscle ache') || checkText.includes('joint')) {
      if (chipLower.includes('joint') || chipLower.includes('muscle')) {
        matchedChip = chip;
        break;
      }
    }
    if (checkText.includes('chest') || checkText.includes('heart') || checkText.includes('angina')) {
      if (chipLower.includes('chest')) {
        matchedChip = chip;
        break;
      }
    }
    if (checkText.includes('cough') || checkText.includes('phlegm')) {
      if (chipLower.includes('cough')) {
        matchedChip = chip;
        break;
      }
    }
    if (checkText.includes('stomach') || checkText.includes('abdomen') || checkText.includes('belly')) {
      if (chipLower.includes('stomach') || chipLower.includes('abdominal')) {
        matchedChip = chip;
        break;
      }
    }
  }

  return {
    verbatimTranscript: verbatim,
    distilledAnswer: distilledAnswer || verbatim,
    negatedEntities,
    affirmedEntities,
    correctionDetected,
    correctionExplanation,
    clinicalCategory: category,
    confidenceScore: correctionDetected ? 0.98 : 0.92,
    matchedChip,
  };
}

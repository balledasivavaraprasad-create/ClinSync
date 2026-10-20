/**
 * Semantic Clinical Parser & Multilingual Question Generation Engine
 *
 * Provides deep semantic understanding of patient utterances:
 * 1. Disentangles core symptoms (e.g. fever, knee pain, headache) from triggers/causes
 *    (e.g. caught in cold rain, playing basketball, food poisoning, prolonged screen time).
 * 2. Extracts duration, severity, functional impact, and associated signs accurately.
 * 3. Detects native languages (Telugu, Hindi, Spanish, English) and generates natural,
 *    conversational follow-up questions spoken and displayed in the patient's language.
 */

export type ClinicalDomain =
  | 'fever'
  | 'cardiac'
  | 'respiratory'
  | 'neuro'
  | 'gi'
  | 'musculoskeletal'
  | 'dermatological'
  | 'general';

export interface ParsedSemantics {
  language: 'en' | 'te' | 'hi' | 'es';
  domain: ClinicalDomain;
  primarySymptom: string;
  triggerOrCause: string | null;
  timeline: string | null;
  severityMentioned: string | null;
  associatedMentioned: string[];
  rawText: string;
}

export interface DynamicQuestionPlan {
  prompt: string;
  subtitle: string;
  category: string;
  quickChips: string[];
  inputType: 'text' | 'chips' | 'slider';
  fieldKey: string;
}

/**
 * Detect language from text content, character scripts, and phonetic words.
 */
export function detectPatientLanguage(
  text: string,
  preferredLanguage?: string
): 'en' | 'te' | 'hi' | 'es' {
  if (!text) {
    if (preferredLanguage === 'te') return 'te';
    if (preferredLanguage === 'hi') return 'hi';
    if (preferredLanguage === 'es') return 'es';
    return 'en';
  }

  // 1. Telugu Script Check (\u0C00 - \u0C7F)
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return 'te';
  }

  // 2. Hindi / Devanagari Script Check (\u0900 - \u097F)
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi';
  }

  const lower = text.toLowerCase();

  // 3. Phonetic / Romanized Telugu words
  const teluguMarkers = [
    'jwaram', 'thala noppi', 'thalanopi', 'daggu', 'aayasam', 'gunde', 'kadupu',
    'kadupulo', 'chali', 'varsham', 'varshamlo', 'ninna', 'eroju', 'nenu', 'undi',
    'undandi', 'vachindi', 'kaligindi', 'thaggaledu', 'nopi', 'noppi', 'kallu',
    'kaalu', 'chetulu', 'mandulu', 'vaadutunnanu', 'mottam', 'cheppandi'
  ];
  if (teluguMarkers.some((term) => lower.includes(term))) {
    return 'te';
  }

  // 4. Phonetic / Romanized Hindi words
  const hindiMarkers = [
    'bukhar', 'sardard', 'khansi', 'saans', 'chhati', 'pet dard', 'pet me',
    'barish', 'kal', 'aaj', 'mujhe', 'ho raha', 'dard hai', 'chakkar', 'ulti'
  ];
  if (hindiMarkers.some((term) => lower.includes(term))) {
    return 'hi';
  }

  // 5. Spanish markers
  if (/\b(?:tengo|fiebre|dolor|pecho|cabeza|tos|estomago|ayer|garganta|respirar|nauseas)\b/i.test(lower)) {
    return 'es';
  }

  if (preferredLanguage === 'te' || preferredLanguage === 'hi' || preferredLanguage === 'es') {
    return preferredLanguage;
  }

  return 'en';
}

/**
 * Extracts deep clinical semantics from a patient's utterance.
 */
export function extractClinicalSemantics(
  text: string,
  preferredLanguage?: string
): ParsedSemantics {
  const language = detectPatientLanguage(text, preferredLanguage);
  const lower = text.toLowerCase().trim();

  // 1. Detect Trigger / Cause (Exposures, Activities, Events)
  let triggerOrCause: string | null = null;
  const triggerMatches: Array<{ pattern: RegExp; extract: (match: RegExpMatchArray) => string }> = [
    {
      pattern: /(?:cold\s+rain|went\s+out.*rain|got\s+wet.*rain|caught\s+in.*rain)/i,
      extract: () => 'being out in the cold rain yesterday',
    },
    {
      pattern: /(?:because|after|due to)\s+(?:i\s+)?(?:just\s+)?(?:went\s+out|traveled|swam|walked|worked)(?!.*rain)/i,
      extract: (m) => m[0].replace(/^(?:because|since|after|due to)\s+(?:i\s+)?(?:just\s+)?/i, 'after '),
    },
    {
      pattern: /(?:after|while|during)\s+(?:playing\s+)?(?:basketball|soccer|football|tennis|cricket|sports|running|exercise|gym|workout)/i,
      extract: (m) => m[0],
    },
    {
      pattern: /(?:after|from)\s+(?:eating\s+)?(?:street\s+food|outside\s+food|spicy\s+food|junk\s+food|dinner|lunch|seafood)/i,
      extract: (m) => m[0],
    },
    {
      pattern: /(?:after|from)\s+(?:lifting\s+)?(?:heavy\s+weights?|heavy\s+boxes?|heavy\s+objects?)/i,
      extract: (m) => m[0],
    },
    {
      pattern: /(?:from|after)\s+(?:staring\s+at|working\s+on)\s+(?:a\s+)?(?:computer|screen|monitor|laptop|phone)/i,
      extract: () => 'prolonged screen time',
    },
    // Telugu triggers
    {
      pattern: /(?:varshamlo|varsham\s+lo|chali\s+varshamlo)\s+(?:vellanu|velladam\s+valla|tadavadam\s+valla)/i,
      extract: () => 'చలి వర్షంలో తడవడం',
    },
    {
      pattern: /వర్షంలో\s+(?:తడవడం|వెళ్లడం)/,
      extract: () => 'చలి వర్షంలో తడవడం',
    },
  ];

  for (const item of triggerMatches) {
    const match = lower.match(item.pattern);
    if (match) {
      triggerOrCause = item.extract(match);
      break;
    }
  }

  // 2. Detect Timeline / Onset
  let timeline: string | null = null;
  const timeRegex = /\b(?:yesterday\s+morning|yesterday\s+night|yesterday|this\s+morning|today|last\s+night|for\s+\d+\s+days?|for\s+\d+\s+hours?|since\s+\d+\s+days?|since\s+yesterday|past\s+week|past\s+2\s+days|past\s+3\s+days|నిన్న|ఈరోజు)\b/i;
  const timeMatch = lower.match(timeRegex);
  if (timeMatch) {
    timeline = timeMatch[0];
  }

  // 3. Detect Domain & Core Primary Symptom
  let domain: ClinicalDomain = 'general';
  let primarySymptom = 'symptoms';

  // Fever / Systemic
  if (
    lower.includes('fever') ||
    lower.includes('temperature') ||
    lower.includes('chills') ||
    lower.includes('jwaram') ||
    lower.includes('జ్వరం') ||
    lower.includes('bukhar') ||
    lower.includes('बुखार')
  ) {
    domain = 'fever';
    primarySymptom = language === 'te' ? 'జ్వరం' : 'fever';
  }
  // Cardiac / Chest
  else if (
    lower.includes('chest') ||
    lower.includes('heart') ||
    lower.includes('tightness') ||
    lower.includes('pressure') ||
    lower.includes('palpitat') ||
    lower.includes('gunde') ||
    lower.includes('ఛాతీ') ||
    lower.includes('chhati')
  ) {
    domain = 'cardiac';
    primarySymptom = language === 'te' ? 'ఛాతీ నొప్పి / బిగుతు' : 'chest tightness';
  }
  // Respiratory / Cough
  else if (
    lower.includes('cough') ||
    lower.includes('wheez') ||
    lower.includes('throat') ||
    lower.includes('breath') ||
    lower.includes('phlegm') ||
    lower.includes('daggu') ||
    lower.includes('దగ్గు') ||
    lower.includes('khansi')
  ) {
    domain = 'respiratory';
    primarySymptom = language === 'te' ? 'దగ్గు' : 'cough';
  }
  // Neurological / Headache
  else if (
    lower.includes('headache') ||
    lower.includes('migraine') ||
    lower.includes('head') ||
    lower.includes('thala noppi') ||
    lower.includes('thalanopi') ||
    lower.includes('తలనొప్పి') ||
    lower.includes('sardard') ||
    lower.includes('dizzy') ||
    lower.includes('vertigo')
  ) {
    domain = 'neuro';
    primarySymptom = language === 'te' ? 'తలనొప్పి' : 'headache';
  }
  // Gastrointestinal / Abdominal
  else if (
    lower.includes('stomach') ||
    lower.includes('abdom') ||
    lower.includes('belly') ||
    lower.includes('nausea') ||
    lower.includes('vomit') ||
    lower.includes('cramp') ||
    lower.includes('kadupu') ||
    lower.includes('కడుపు') ||
    lower.includes('pet dard')
  ) {
    domain = 'gi';
    primarySymptom = language === 'te' ? 'కడుపు నొప్పి' : 'abdominal discomfort';
  }
  // Musculoskeletal / Joint
  else if (
    lower.includes('knee') ||
    lower.includes('back') ||
    lower.includes('shoulder') ||
    lower.includes('ankle') ||
    lower.includes('wrist') ||
    lower.includes('joint') ||
    lower.includes('muscle') ||
    lower.includes('sprain') ||
    lower.includes('strain') ||
    lower.includes('swollen') ||
    lower.includes('మోకాలు') ||
    lower.includes('నొప్పి')
  ) {
    domain = 'musculoskeletal';
    if (lower.includes('knee') || lower.includes('మోకాలు')) {
      primarySymptom = language === 'te' ? 'మోకాలి నొప్పి' : 'knee pain';
    } else if (lower.includes('back')) {
      primarySymptom = language === 'te' ? 'వెన్ను నొప్పి' : 'back pain';
    } else {
      primarySymptom = language === 'te' ? 'కీళ్ల నొప్పి' : 'joint pain';
    }
  }
  // Dermatological / Skin
  else if (
    lower.includes('rash') ||
    lower.includes('itch') ||
    lower.includes('burn') ||
    lower.includes('cut') ||
    lower.includes('bite') ||
    lower.includes('skin') ||
    lower.includes('దద్దుర్లు')
  ) {
    domain = 'dermatological';
    primarySymptom = language === 'te' ? 'చర్మంపై దద్దుర్లు / దురద' : 'skin rash';
  }

  // 4. Severity
  let severityMentioned: string | null = null;
  if (/\b(?:severe|unbearable|high|extreme|intense|terrible|bad|తీవ్రమైన|bahut\s+jyada)\b/i.test(lower)) {
    severityMentioned = 'severe';
  } else if (/\b(?:mild|slight|little|bit|తేలికపాటి|halka)\b/i.test(lower)) {
    severityMentioned = 'mild';
  } else if (/\b(?:moderate|medium|మధ్యస్థంగా)\b/i.test(lower)) {
    severityMentioned = 'moderate';
  }

  // 5. Associated symptoms
  const associatedMentioned: string[] = [];
  if (lower.includes('chill') || lower.includes('chali') || lower.includes('చలి')) associatedMentioned.push('chills');
  if (lower.includes('nausea') || lower.includes('vomit') || lower.includes('వాంతి')) associatedMentioned.push('nausea');
  if (lower.includes('breath') || lower.includes('aayasam') || lower.includes('ఆయాసం')) associatedMentioned.push('shortness of breath');
  if (lower.includes('sweat') || lower.includes('చెమట')) associatedMentioned.push('sweats');

  return {
    language,
    domain,
    primarySymptom,
    triggerOrCause,
    timeline,
    severityMentioned,
    associatedMentioned,
    rawText: text,
  };
}

/**
 * Builds an empathetic, clinically reasoned follow-up question across the 6 intake turns.
 */
export function buildClinicallyReasonedQuestion(
  semantics: ParsedSemantics,
  stepIndex: number,
  _answersHistory: Record<string, string>
): DynamicQuestionPlan {
  const { language, domain, primarySymptom, triggerOrCause, timeline } = semantics;

  // =========================================================================
  // Question 2 (Turn 2, stepIndex === 1)
  // Focus: Onset, Sensation & Progression acknowledging triggers semantically
  // =========================================================================
  if (stepIndex === 1) {
    // TELUGU FLOW
    if (language === 'te') {
      if (domain === 'fever') {
        const triggerPhrase = triggerOrCause ? 'నిన్న చలి వర్షంలో తడవడం వల్ల' : 'మీకు';
        return {
          prompt: `${triggerPhrase} జ్వరం వచ్చిందని అర్థమైంది. జ్వరంతో పాటు చలి లేదా వణుకు ఉందా, మీరు ఉష్ణోగ్రతను (temperature) చెక్ చేశారా?`,
          subtitle: 'జ్వరం తీవ్రతను బట్టి వైద్య బృందం సరైన చికిత్సను నిర్ణయిస్తుంది.',
          category: 'జ్వరం లక్షణాలు & తీవ్రత',
          quickChips: [
            'తీవ్రమైన జ్వరం & చలి',
            'తేలికపాటి జ్వరం మాత్రమే',
            '101 డిగ్రీల కంటే ఎక్కువ',
            'సాయంత్రం మాత్రమే పెరుగుతుంది',
          ],
          inputType: 'chips',
          fieldKey: 'duration',
        };
      }
      if (domain === 'cardiac') {
        return {
          prompt: 'ఛాతీలో బిగుతుగా లేదా నొప్పిగా ఉందని అర్థమైంది. ఈ నొప్పి ఎంతసేపటి నుండి ఉంది, ఇది మీ ఎడమ చేయి, మెడ లేదా దవడ వైపు వ్యాపిస్తుందా?',
          subtitle: 'గుండె సంబంధిత అత్యవసర పరిస్థితిని అంచనా వేయడానికి ఈ వివరాలు అవసరం.',
          category: 'ఛాతీ నొప్పి & తీవ్రత',
          quickChips: [
            'ఈ ఉదయమే ప్రారంభమైంది',
            '2-3 రోజుల నుండి ఒత్తిడిగా ఉంది',
            'ఎడమ చేతికి పాకుతోంది',
            'నడుస్తున్నప్పుడు ఎక్కువవుతోంది',
          ],
          inputType: 'chips',
          fieldKey: 'duration',
        };
      }
      if (domain === 'respiratory') {
        return {
          prompt: 'ఎన్ని రోజుల నుండి ఈ దగ్గు ఉంది, దగ్గుతో పాటు కఫం పడుతోందా లేదా జ్వరం వస్తోందా?',
          subtitle: 'పొడి దగ్గా లేదా కఫంతో కూడినదా అనేది నిర్ధారించడానికి.',
          category: 'దగ్గు స్వభావం & కాలవ్యవధి',
          quickChips: [
            '3 రోజుల నుండి పొడి దగ్గు',
            'పసుపు రంగు కఫం పడుతోంది',
            'తేలికపాటి జ్వరం ఉంది',
            'రాత్రి వేళల్లో ఎక్కువవుతోంది',
          ],
          inputType: 'chips',
          fieldKey: 'duration',
        };
      }
      return {
        prompt: `మీరు ${primarySymptom}తో బాధపడుతున్నారని అర్థమైంది. ఇది ఎప్పుడు ప్రారంభమైంది, ఇది క్రమంగా పెరుగుతోందా లేదా స్థిరంగా ఉందా?`,
        subtitle: 'మీ లక్షణాల ప్రాధాన్యతను గుర్తించడానికి వివరాలు సహాయపడతాయి.',
        category: 'లక్షణాల వ్యవధి',
        quickChips: [
          'గత 24 గంటల్లో ప్రారంభమైంది',
          '2-3 రోజుల నుండి ఉంది',
          'వారం రోజులుగా పెరుగుతోంది',
          'అప్పుడప్పుడు వస్తోంది',
        ],
        inputType: 'chips',
        fieldKey: 'duration',
      };
    }

    // ENGLISH FLOW
    if (domain === 'fever') {
      const triggerPhrase = triggerOrCause
        ? `I understand you developed a fever after ${triggerOrCause.replace(/^after\s+/i, '')}`
        : 'I hear that you are experiencing a fever';
      const timeRef = timeline ? ` since ${timeline.replace(/^(?:since|for)\s+/i, '')}` : '';

      return {
        prompt: `${triggerPhrase}${timeRef}. Has the fever been high or accompanied by chills, and have you checked your temperature with a thermometer?`,
        subtitle: 'Understanding fever severity and chills helps our clinical team determine urgency.',
        category: 'Fever Profile & Chills',
        quickChips: [
          'High fever with severe chills',
          'Mild low-grade fever',
          'Measured over 101°F / 38.3°C',
          'Fluctuating throughout the day',
        ],
        inputType: 'chips',
        fieldKey: 'duration',
      };
    }

    if (domain === 'cardiac') {
      return {
        prompt:
          'I understand you are experiencing chest tightness. How long have you felt this tightness, and does it spread to your neck, jaw, shoulder, or left arm?',
        subtitle: 'Knowing onset timeline and radiation helps our cardiology team evaluate urgency.',
        category: 'Symptom Timeline & Radiation',
        quickChips: [
          'Started this morning',
          'About 2 to 3 days, mild pressure',
          'Radiates slightly to left arm',
          'Constant heaviness for a week',
        ],
        inputType: 'chips',
        fieldKey: 'duration',
      };
    }

    if (domain === 'respiratory') {
      return {
        prompt:
          'How many days have you had this cough, and are you bringing up any yellow/green phlegm or running a fever?',
        subtitle: 'Distinguishing dry vs productive cough helps determine respiratory treatment.',
        category: 'Cough Character & Progression',
        quickChips: [
          'Dry cough for 3 days',
          'Productive with yellow phlegm',
          'Accompanied by mild fever',
          'Worse at night and early morning',
        ],
        inputType: 'chips',
        fieldKey: 'duration',
      };
    }

    if (domain === 'musculoskeletal') {
      const triggerPhrase = triggerOrCause
        ? `after ${triggerOrCause.replace(/^after\s+/i, '')}`
        : 'since it started';
      return {
        prompt: `I understand you experienced ${primarySymptom} ${triggerPhrase}. Did you hear or feel a popping sound at the time, and are you able to bend or bear weight on it?`,
        subtitle: 'Assessing mechanical triggers and weight-bearing helps prioritize orthopedic care.',
        category: 'Onset & Injury Context',
        quickChips: [
          'Cannot bear weight, severe swelling',
          'Limping but can walk slowly',
          'Felt a sudden pop or twist',
          'Stiff with no visible swelling',
        ],
        inputType: 'chips',
        fieldKey: 'duration',
      };
    }

    if (domain === 'neuro') {
      const triggerPhrase = triggerOrCause ? `after ${triggerOrCause.replace(/^after\s+/i, '')}` : '';
      return {
        prompt: `I understand you are experiencing a ${primarySymptom} ${triggerPhrase}. Is it a constant throbbing ache or sharp intermittent pain, and when did it first start?`,
        subtitle: 'Characterizing the pain sensation helps differentiate tension, migraine, or sinus pressure.',
        category: 'Onset & Sensation',
        quickChips: [
          'Constant throbbing since today',
          'Past 2 to 3 days, comes in waves',
          'Sharp pressure behind the eyes',
          'Dull heaviness for a week',
        ],
        inputType: 'chips',
        fieldKey: 'duration',
      };
    }

    if (domain === 'gi') {
      const triggerPhrase = triggerOrCause ? `after ${triggerOrCause.replace(/^after\s+/i, '')}` : '';
      return {
        prompt: `How long has this abdominal discomfort been present ${triggerPhrase}, and is it sharp, cramping, or worse after eating?`,
        subtitle: 'Localizing abdominal pain guides appropriate abdominal evaluation.',
        category: 'Abdominal Pain Specifics',
        quickChips: [
          'Started suddenly after a meal',
          'Constant dull ache for 2 days',
          'Sharp cramps that come and go',
          'Burning sensation in upper stomach',
        ],
        inputType: 'chips',
        fieldKey: 'duration',
      };
    }

    return {
      prompt: `When did your ${primarySymptom} first begin, and have symptoms been improving, worsening, or staying about the same?`,
      subtitle: 'Acute vs subacute onset determines consultation priority.',
      category: 'Symptom Timeline',
      quickChips: [
        'Started in the last 24 hours',
        'Present for 2 to 3 days',
        'Gradually worsening over a week',
        'Intermittent over the past month',
      ],
      inputType: 'chips',
      fieldKey: 'duration',
    };
  }

  // =========================================================================
  // Question 3 (Turn 3, stepIndex === 2)
  // Focus: Severity Rating (0-10) & Daily Impact
  // =========================================================================
  if (stepIndex === 2) {
    if (language === 'te') {
      return {
        prompt: `0 నుండి 10 స్కేలులో, ప్రస్తుతం మీ ${primarySymptom} ఎంత తీవ్రంగా ఉంది, ఇది మీ నిద్ర లేదా రోజువారీ పనులకు ఇబ్బంది కలిగిస్తుందా?`,
        subtitle: '0 అంటే ఎటువంటి నొప్పి లేదు; 10 అంటే భరించలేని అత్యంత తీవ్రమైన నొప్పి.',
        category: 'లక్షణం తీవ్రత (0-10)',
        quickChips: ['3 - తేలికపాటి', '5 - మధ్యస్థం', '8 - తీవ్రమైన ఇబ్బంది', 'నిద్ర పట్టడం లేదు'],
        inputType: 'slider',
        fieldKey: 'severity',
      };
    }

    if (domain === 'cardiac') {
      return {
        prompt:
          'On a scale from 0 to 10, how severe is your chest discomfort right now, and does it worsen with physical exertion?',
        subtitle: '0 is completely pain-free; 10 is the most severe pain imaginable.',
        category: 'Discomfort Rating & Exertion',
        quickChips: ['3 - Mild', '5 - Moderate', '8 - Severe', 'Worse when walking'],
        inputType: 'slider',
        fieldKey: 'severity',
      };
    }

    if (domain === 'fever') {
      return {
        prompt:
          'On a scale from 0 to 10, how intense is your fever and weakness right now, and is it preventing you from working or sleeping?',
        subtitle: 'Quantifies constitutional symptoms to prioritize clinical response.',
        category: 'Fever Intensity & Weakness',
        quickChips: ['3 - Mild exhaustion', '6 - Moderate, bed-bound', '8 - Severe shaking and high fever', 'Completely unable to eat or work'],
        inputType: 'slider',
        fieldKey: 'severity',
      };
    }

    return {
      prompt: `On a scale from 0 to 10, how intense is your ${primarySymptom} right now, and does it interfere with your work or sleep?`,
      subtitle: 'Quantifies symptom severity to inform clinical decision-making.',
      category: 'Discomfort & Daily Impact',
      quickChips: ['2 - Mild annoyance', '4 - Moderate discomfort', '7 - Severe, disrupts sleep', 'Interferes with daily work'],
      inputType: 'slider',
      fieldKey: 'severity',
    };
  }

  // =========================================================================
  // Question 4 (Turn 4, stepIndex === 3)
  // Focus: Associated Signs & Secondary Red Flags
  // =========================================================================
  if (stepIndex === 3) {
    if (language === 'te') {
      if (domain === 'fever') {
        return {
          prompt: 'జ్వరంతో పాటు దగ్గు, గొంతు నొప్పి, తలనొప్పి, వాంతులు లేదా శ్వాస తీసుకోవడంలో ఇబ్బంది ఏమైనా ఉందా?',
          subtitle: 'ఇతర ఇన్ఫెక్షన్ లక్షణాలను గుర్తించడానికి.',
          category: 'సంబంధిత లక్షణాలు',
          quickChips: [
            'గొంతు నొప్పి & దగ్గు',
            'తీవ్రమైన తలనొప్పి',
            'వాంతులు / ఆకలి లేకపోవడం',
            'ఇతర లక్షణాలు ఏవీ లేవు',
          ],
          inputType: 'chips',
          fieldKey: 'associated_symptoms',
        };
      }
      return {
        prompt: `${primarySymptom}తో పాటు మైకం, వికారం, జ్వరం లేదా ఇతర ఇబ్బందులు ఏమైనా ఉన్నాయా?`,
        subtitle: 'వైద్యుల అంచనా కోసం ఇతర సంకేతాలను తెలుపండి.',
        category: 'సంబంధిత లక్షణాలు',
        quickChips: ['వికారం లేదా వాంతులు', 'మైకం / కళ్లు తిరగడం', 'తీవ్రమైన అలసట', 'ఇతర లక్షణాలు ఏవీ లేవు'],
        inputType: 'chips',
        fieldKey: 'associated_symptoms',
      };
    }

    if (domain === 'fever') {
      return {
        prompt:
          'Alongside the fever, are you experiencing any cough, sore throat, severe headache, breathing difficulty, or vomiting?',
        subtitle: 'Identifies systemic or respiratory infection indicators.',
        category: 'Associated Infection Signs',
        quickChips: [
          'Sore throat and nasal congestion',
          'Severe body ache and headache',
          'Nausea or stomach upset',
          'Dry cough',
          'No other associated symptoms',
        ],
        inputType: 'chips',
        fieldKey: 'associated_symptoms',
      };
    }

    if (domain === 'cardiac') {
      return {
        prompt: 'Are you experiencing any shortness of breath, cold sweats, dizziness, or nausea today?',
        subtitle: 'Screening for secondary cardiovascular indicators.',
        category: 'Accompanying Symptoms',
        quickChips: [
          'Shortness of breath on exertion',
          'Dizziness / lightheadedness',
          'Cold sweats',
          'Nausea or reduced appetite',
          'No other symptoms',
        ],
        inputType: 'chips',
        fieldKey: 'associated_symptoms',
      };
    }

    return {
      prompt: `Are you experiencing any other accompanying symptoms today, such as fever, dizziness, nausea, fatigue, or body aches?`,
      subtitle: 'Secondary systemic signs help clarify diagnostic context.',
      category: 'Associated Systemic Symptoms',
      quickChips: [
        'Low-grade fever & chills',
        'Dizziness or lightheadedness',
        'Fatigue and body aches',
        'Mild nausea',
        'No other symptoms',
      ],
      inputType: 'chips',
      fieldKey: 'associated_symptoms',
    };
  }

  // =========================================================================
  // Question 5 (Turn 5, stepIndex === 4)
  // Focus: Triggers, Relieving Factors & Medications Taken
  // =========================================================================
  if (stepIndex === 4) {
    if (language === 'te') {
      return {
        prompt: `${primarySymptom} తగ్గడానికి మీరు పారాసిటమాల్ లేదా ఇతర మాత్రలు ఏమైనా వేసుకున్నారా, ఏదైనా చేయడం వల్ల కాస్త ఉపశమనం కలిగిందా?`,
        subtitle: 'గతంలో వాడిన మందుల వివరాలు వైద్యులకు సహాయపడతాయి.',
        category: 'వాడిన మందులు & ఉపశమనం',
        quickChips: [
          'డోలో 650 (Dolo/Paracetamol) వేసుకున్నాను',
          'మందులు వాడినా తగ్గలేదు',
          'విశ్రాంతి తీసుకుంటే కొద్దిగా నయమైంది',
          'ఇంకా ఎటువంటి మందులు తీసుకోలేదు',
        ],
        inputType: 'chips',
        fieldKey: 'triggers_treatments',
      };
    }

    if (domain === 'fever') {
      return {
        prompt:
          'Have you taken any fever-reducing medications like paracetamol, acetaminophen, or ibuprofen, and did it bring your temperature down?',
        subtitle: 'Evaluating response to antipyretics guides clinical treatment.',
        category: 'Antipyretic Response & Relief',
        quickChips: [
          'Took Paracetamol / Tylenol (fever dropped temporarily)',
          'Took Ibuprofen with little relief',
          'Resting and drinking hot fluids',
          "Haven't taken any medications yet",
        ],
        inputType: 'chips',
        fieldKey: 'triggers_treatments',
      };
    }

    return {
      prompt: `Does anything specific seem to trigger or relieve your ${primarySymptom}, and have you taken any medications or home remedies to relieve it?`,
      subtitle: 'Clarifies modifying factors and therapeutic attempts.',
      category: 'Triggers & Relieving Factors',
      quickChips: [
        'Took over-the-counter pain relief',
        'Resting helps reduce symptoms',
        'Worse with physical activity',
        'Nothing seems to help',
        "Haven't tried any remedies yet",
      ],
      inputType: 'chips',
      fieldKey: 'triggers_treatments',
    };
  }

  // =========================================================================
  // Question 6 (Turn 6, stepIndex === 5)
  // Focus: Medical History, Chronic Conditions, Allergies & Doctor Consult
  // =========================================================================
  if (language === 'te') {
    return {
      prompt:
        'డాక్టర్ కన్సల్టేషన్ కోసం: మీకు బీపీ, షుగర్ లేదా ఆస్తమా లాంటి ఇతర సమస్యలు ఉన్నాయా, ఏవైనా మందుల వల్ల అలర్జీలు ఉన్నాయా?',
      subtitle: 'ఈ సమగ్ర వివరాలు వైద్యులకు తక్షణ నిర్ణయాలు తీసుకోవడానికి తోడ్పడతాయి.',
      category: 'మెడికల్ హిస్టరీ & రివ్యూ',
      quickChips: [
        'ఎటువంటి అలర్జీలు లేదా ఇతర సమస్యలు లేవు',
        'రక్తపోటు (BP) మందులు వాడుతున్నాను',
        'మధుమేహం (Diabetes) ఉంది',
        'ఆస్తమా / అలర్జీ సమస్యలు ఉన్నాయి',
        'డాక్టర్‌తో టెస్టుల గురించి చర్చించాలి',
      ],
      inputType: 'text',
      fieldKey: 'medical_history_review',
    };
  }

  return {
    prompt:
      'To complete your intake for the physician: do you have any chronic medical conditions, regular prescription medications, drug allergies, or specific questions you want prioritized during your consultation?',
    subtitle: 'This final clinical review equips your attending doctor with full context before exam.',
    category: 'Medication & Medical History Review',
    quickChips: [
      'No regular medications or drug allergies',
      'Blood pressure medication (e.g., Lisinopril, Amlodipine)',
      'Asthma / respiratory history',
      'Diabetes / routine prescriptions',
      'Penicillin / antibiotic allergy',
      'Want doctor to check if imaging/tests needed',
    ],
    inputType: 'text',
    fieldKey: 'medical_history_review',
  };
}

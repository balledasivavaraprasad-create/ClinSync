/**
 * ElevenLabs Speech Synthesis Service for ClinSync
 * Powered by ElevenLabs flash/turbo models with natural human voices.
 */

export const ELEVENLABS_CONFIG = {
  apiKey: (import.meta.env.VITE_ELEVENLABS_API_KEY as string) || '',
  modelId: 'eleven_flash_v2_5',
  voices: {
    receptionist: 'EXAVITQu4vr4xnSDxMaL', // Bella (warm, empathetic female receptionist)
    clinician: 'ErXwobaYiN019PkySvjV', // Antoni (clear, professional clinical voice)
  },
};

// In-memory cache for synthesized audio Blobs to minimize latency and API quota
const audioBlobCache = new Map<string, string>();

/**
 * Synthesizes text using ElevenLabs API and returns a playable Blob Object URL.
 * Falls back cleanly if offline or if API quota is reached.
 */
export async function synthesizeSpeech(
  text: string,
  voiceType: 'receptionist' | 'clinician' = 'receptionist'
): Promise<string | null> {
  if (!ELEVENLABS_CONFIG.apiKey) {
    return null;
  }

  const voiceId = ELEVENLABS_CONFIG.voices[voiceType] || ELEVENLABS_CONFIG.voices.receptionist;
  const cacheKey = `${voiceId}:${text.trim()}`;

  if (audioBlobCache.has(cacheKey)) {
    return audioBlobCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_CONFIG.modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.warn('ElevenLabs API error:', errJson);
      return null;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    audioBlobCache.set(cacheKey, objectUrl);
    return objectUrl;
  } catch (err) {
    console.warn('Failed to call ElevenLabs TTS service:', err);
    return null;
  }
}

/**
 * Speaks text using ElevenLabs audio if available, or falls back to Web SpeechSynthesis.
 */
export async function speakTextHuman(
  text: string,
  options?: {
    voiceType?: 'receptionist' | 'clinician';
    preRenderedUrl?: string;
    onStart?: () => void;
    onEnd?: () => void;
  }
): Promise<HTMLAudioElement | null> {
  options?.onStart?.();

  // 1. Try pre-rendered audio first for instantaneous, 100% reliable zero-latency playback
  if (options?.preRenderedUrl) {
    try {
      const audio = new Audio(options.preRenderedUrl);
      audio.onended = () => options?.onEnd?.();
      audio.onerror = async () => {
        // Fall back to dynamic ElevenLabs synthesis if pre-rendered file fails
        await fallbackDynamicOrWebSpeech(text, options);
      };
      await audio.play();
      return audio;
    } catch {
      // Autoplay blocked or load failed; try dynamic or Web Speech
    }
  }

  return fallbackDynamicOrWebSpeech(text, options);
}

async function fallbackDynamicOrWebSpeech(
  text: string,
  options?: {
    voiceType?: 'receptionist' | 'clinician';
    onStart?: () => void;
    onEnd?: () => void;
  }
): Promise<HTMLAudioElement | null> {
  // 2. Try dynamic ElevenLabs synthesis
  const dynamicUrl = await synthesizeSpeech(text, options?.voiceType || 'receptionist');
  if (dynamicUrl) {
    try {
      const audio = new Audio(dynamicUrl);
      audio.onended = () => options?.onEnd?.();
      audio.onerror = () => speakViaBrowserSynthesis(text, options?.onEnd);
      await audio.play();
      return audio;
    } catch {
      speakViaBrowserSynthesis(text, options?.onEnd);
      return null;
    }
  }

  // 3. Fallback to Browser Speech Synthesis
  speakViaBrowserSynthesis(text, options?.onEnd);
  return null;
}

function speakViaBrowserSynthesis(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  } catch {
    onEnd?.();
  }
}

export interface ElevenLabsTranscriptionResult {
  text: string;
  language_code?: string;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    type: string;
    logprob?: number;
  }>;
}

/**
 * High-accuracy Speech-to-Text using ElevenLabs Scribe STT model.
 * Transcribes recorded user audio stream into accurate text.
 */
export async function transcribeAudioWithElevenLabs(
  audioBlob: Blob,
  languageCode: string = 'eng'
): Promise<ElevenLabsTranscriptionResult | null> {
  if (!ELEVENLABS_CONFIG.apiKey) {
    return null;
  }

  const formData = new FormData();
  const extension = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
  formData.append('file', audioBlob, `speech_recording.${extension}`);
  formData.append('model_id', 'scribe_v1');
  if (languageCode) {
    formData.append('language_code', languageCode);
  }
  formData.append('tag_audio_events', 'false');

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_CONFIG.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      console.warn('ElevenLabs STT API error:', errJson);
      return null;
    }

    const data = await response.json();
    return {
      text: data.text || '',
      language_code: data.language_code,
      words: data.words,
    };
  } catch (err) {
    console.warn('Failed to contact ElevenLabs STT API:', err);
    return null;
  }
}

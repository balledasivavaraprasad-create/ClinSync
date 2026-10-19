export type SupportedLanguage =
  // 10 Major Global Languages
  | 'en' // English
  | 'es' // Spanish / Español
  | 'zh' // Chinese / 中文
  | 'fr' // French / Français
  | 'de' // German / Deutsch
  | 'ar' // Arabic / العربية
  | 'ru' // Russian / Русский
  | 'ja' // Japanese / 日本語
  | 'pt' // Portuguese / Português
  | 'ko' // Korean / 한국어
  // Popular Indian Languages
  | 'hi' // Hindi / हिन्दी
  | 'te' // Telugu / తెలుగు
  | 'ta' // Tamil / தமிழ்
  | 'kn' // Kannada / ಕನ್ನಡ
  | 'bn' // Bengali / বাংলা
  | 'mr' // Marathi / मराठी
  | 'gu' // Gujarati / ગુજરાતી
  | 'ml'; // Malayalam / മലയാളം

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  category: 'global' | 'indian';
  localeCode: string;
  flagHint?: string;
  isRTL?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  // 10 Major Global Languages
  { code: 'en', name: 'English', nativeName: 'English (US)', category: 'global', localeCode: 'en-US', flagHint: 'EN', isRTL: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', category: 'global', localeCode: 'es-ES', flagHint: 'ES', isRTL: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (Mandarin)', category: 'global', localeCode: 'zh-CN', flagHint: 'ZH', isRTL: false },
  { code: 'fr', name: 'French', nativeName: 'Français', category: 'global', localeCode: 'fr-FR', flagHint: 'FR', isRTL: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', category: 'global', localeCode: 'de-DE', flagHint: 'DE', isRTL: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', category: 'global', localeCode: 'ar-SA', flagHint: 'AR', isRTL: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', category: 'global', localeCode: 'ru-RU', flagHint: 'RU', isRTL: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', category: 'global', localeCode: 'ja-JP', flagHint: 'JA', isRTL: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', category: 'global', localeCode: 'pt-BR', flagHint: 'PT', isRTL: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', category: 'global', localeCode: 'ko-KR', flagHint: 'KO', isRTL: false },
  // Popular Indian Languages
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', category: 'indian', localeCode: 'hi-IN', flagHint: 'HI', isRTL: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', category: 'indian', localeCode: 'te-IN', flagHint: 'TE', isRTL: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', category: 'indian', localeCode: 'ta-IN', flagHint: 'TA', isRTL: false },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', category: 'indian', localeCode: 'kn-IN', flagHint: 'KN', isRTL: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', category: 'indian', localeCode: 'bn-IN', flagHint: 'BN', isRTL: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', category: 'indian', localeCode: 'mr-IN', flagHint: 'MR', isRTL: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', category: 'indian', localeCode: 'gu-IN', flagHint: 'GU', isRTL: false },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', category: 'indian', localeCode: 'ml-IN', flagHint: 'ML', isRTL: false },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export function getLanguageMeta(code: SupportedLanguage): LanguageMeta {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
}

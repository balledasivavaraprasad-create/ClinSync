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
}

export interface KioskTranslations {
  title: string;
  subtitle: string;
  returningBtn: string;
  returningDesc: string;
  newBtn: string;
  newDesc: string;
  staffBtn: string;
  staffDesc: string;
  emergency: string;
  privacyNote: string;
  fastCheckInBadge: string;
  registrationBadge: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  // 10 Major Global Languages
  { code: 'en', name: 'English', nativeName: 'English (US)', category: 'global', localeCode: 'en-US' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', category: 'global', localeCode: 'es-ES' },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (Mandarin)', category: 'global', localeCode: 'zh-CN' },
  { code: 'fr', name: 'French', nativeName: 'Français', category: 'global', localeCode: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', category: 'global', localeCode: 'de-DE' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', category: 'global', localeCode: 'ar-SA' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', category: 'global', localeCode: 'ru-RU' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', category: 'global', localeCode: 'ja-JP' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', category: 'global', localeCode: 'pt-BR' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', category: 'global', localeCode: 'ko-KR' },
  // Popular Indian Languages
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', category: 'indian', localeCode: 'hi-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', category: 'indian', localeCode: 'te-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', category: 'indian', localeCode: 'ta-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', category: 'indian', localeCode: 'kn-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', category: 'indian', localeCode: 'bn-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', category: 'indian', localeCode: 'mr-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', category: 'indian', localeCode: 'gu-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', category: 'indian', localeCode: 'ml-IN' },
];

export const KIOSK_TRANSLATIONS: Record<SupportedLanguage, KioskTranslations> = {
  // 1. English
  en: {
    title: 'Welcome to ClinSync Intake',
    subtitle: 'Self-service clinical check-in & automated triage assistance',
    returningBtn: 'Returning Patient',
    returningDesc: 'Check in with Patient ID, registered mobile, or biometric scan',
    newBtn: 'New Patient',
    newDesc: 'First time visiting our clinic? Register your details in 2 minutes',
    staffBtn: 'Request Staff Assistance',
    staffDesc: 'Need help with check-in, mobility assistance, or translation?',
    emergency: 'Severe chest pain, trouble breathing, or sudden numbness? Tap here immediately.',
    privacyNote: 'Your privacy is protected. Identity is verified before any medical records are displayed.',
    fastCheckInBadge: 'Fast Check-in',
    registrationBadge: 'Registration',
  },

  // 2. Spanish
  es: {
    title: 'Bienvenido al Registro de ClinSync',
    subtitle: 'Registro clínico de autoservicio y asistencia de triaje automatizada',
    returningBtn: 'Paciente Registrado',
    returningDesc: 'Inicie sesión con su ID, teléfono móvil o escaneo biométrico',
    newBtn: 'Paciente Nuevo',
    newDesc: '¿Primera vez en nuestra clínica? Registre sus datos en 2 minutos',
    staffBtn: 'Solicitar Asistencia del Personal',
    staffDesc: '¿Necesita ayuda con el registro, movilidad o traducción?',
    emergency: '¿Dolor severo en el pecho o dificultad para respirar? Toque aquí de inmediato.',
    privacyNote: 'Su privacidad está protegida. La identidad se verifica antes de mostrar registros médicos.',
    fastCheckInBadge: 'Registro Rápido',
    registrationBadge: 'Inscripción',
  },

  // 3. Chinese
  zh: {
    title: '欢迎使用 ClinSync 临床接诊系统',
    subtitle: '自助临床报到与智能化分诊辅助服务',
    returningBtn: '复诊患者报到',
    returningDesc: '使用患者编号、注册手机号或生物识别核验进入',
    newBtn: '初诊患者注册',
    newDesc: '初次就诊？仅需2分钟即可完成基础信息登记',
    staffBtn: '呼叫工作人员协助',
    staffDesc: '如需操作指导、行动不便协助或人工翻译服务',
    emergency: '如有突发剧烈胸痛、呼吸急促或肢体麻木，请立即点击此处。',
    privacyNote: '您的隐私受到严格保护。在身份确认前绝不展示任何既往就诊记录。',
    fastCheckInBadge: '快捷报到',
    registrationBadge: '新客建档',
  },

  // 4. French
  fr: {
    title: 'Bienvenue à l’Accueil ClinSync',
    subtitle: 'Enregistrement clinique autonome et orientation médicale intelligente',
    returningBtn: 'Patient Déjà Enregistré',
    returningDesc: 'Identifiez-vous par numéro de dossier, téléphone ou biométrie',
    newBtn: 'Nouveau Patient',
    newDesc: 'Première consultation ? Enregistrez vos coordonnées en 2 minutes',
    staffBtn: 'Demander l’Aide du Personnel',
    staffDesc: 'Besoin d’aide pour l’accueil, la mobilité ou la traduction ?',
    emergency: 'Douleur thoracique aiguë, essoufflement ou malaise ? Touchez ici immédiatement.',
    privacyNote: 'Votre confidentialité est protégée. L’identité est vérifiée avant tout affichage médical.',
    fastCheckInBadge: 'Enregistrement Rapide',
    registrationBadge: 'Inscription',
  },

  // 5. German
  de: {
    title: 'Willkommen bei ClinSync',
    subtitle: 'Selbstbedienungs-Check-in & automatisierte Triage-Unterstützung',
    returningBtn: 'Bereits registrierter Patient',
    returningDesc: 'Check-in mit Patienten-ID, Mobilnummer oder Biometrie',
    newBtn: 'Neuer Patient',
    newDesc: 'Erster Besuch? Erfassen Sie Ihre Daten in nur 2 Minuten',
    staffBtn: 'Personal-Unterstützung anfordern',
    staffDesc: 'Benötigen Sie Hilfe beim Check-in, Mobilität oder Übersetzung?',
    emergency: 'Akute Brustschmerzen, Atemnot oder Taubheitsgefühl? Hier sofort tippen.',
    privacyNote: 'Ihre Daten sind geschützt. Identitätsprüfung vor Anzeige von Krankenakten.',
    fastCheckInBadge: 'Schnell-Check-in',
    registrationBadge: 'Registrierung',
  },

  // 6. Arabic
  ar: {
    title: 'مرحبًا بك في نظام استقبال ClinSync',
    subtitle: 'تسجيل سريري ذاتي ومساعدة الفرز الطبي الذكي',
    returningBtn: 'مريض مسجل مسبقًا',
    returningDesc: 'سجل الدخول برقم المريض، أو الجوال، أو المسح الحيوي',
    newBtn: 'مريض جديد',
    newDesc: 'زيارتك الأولى؟ سجل بياناتك الطبية خلال دقيقتين',
    staffBtn: 'طلب مساعدة الموظفين',
    staffDesc: 'هل تحتاج إلى مساعدة في التسجيل أو التنقل أو الترجمة؟',
    emergency: 'ألم حاد في الصدر، ضيق في التنفس، أو خدر مفاجئ؟ اضغط هنا فورًا.',
    privacyNote: 'خصوصيتك محمية بدقة. يتم التحقق من الهوية قبل عرض السجلات الطبية.',
    fastCheckInBadge: 'تسجيل سريع',
    registrationBadge: 'تسجيل جديد',
  },

  // 7. Russian
  ru: {
    title: 'Добро пожаловать в ClinSync',
    subtitle: 'Самостоятельная регистрация и автоматизированная сортировка',
    returningBtn: 'Повторный пациент',
    returningDesc: 'Вход по номеру карты, телефону или биометрии',
    newBtn: 'Новый пациент',
    newDesc: 'Впервые в клинике? Заполните данные за 2 минуты',
    staffBtn: 'Помощь персонала клиники',
    staffDesc: 'Нужна помощь с регистрацией, передвижением или переводом?',
    emergency: 'Острая боль в груди, удушье или онемение? Нажмите здесь немедленно.',
    privacyNote: 'Ваши данные защищены. Идентификация проводится до показа истории болезни.',
    fastCheckInBadge: 'Быстрый вход',
    registrationBadge: 'Регистрация',
  },

  // 8. Japanese
  ja: {
    title: 'ClinSync 総合受付へようこそ',
    subtitle: 'セルフメディカルチェックイン＆AIトリアージ支援',
    returningBtn: '再診の方 (診察券をお持ちの方)',
    returningDesc: '患者ID、登録電話番号、または生体認証でチェックイン',
    newBtn: '初診の方 (初めての受診)',
    newDesc: '当院のご利用が初めての方は、約2分で受付登録が完了します',
    staffBtn: 'スタッフをお呼び出し',
    staffDesc: '受付操作、移動の介助、または通訳が必要な方はこちら',
    emergency: '激しい胸の痛み、呼吸困難、突然の麻痺がある場合は、直ちにここを押してください。',
    privacyNote: '患者様のプライバシーは厳格に保護されます。本人確認完了までカルテは表示されません。',
    fastCheckInBadge: 'クイック受付',
    registrationBadge: '新規登録',
  },

  // 9. Portuguese
  pt: {
    title: 'Bem-vindo ao Atendimento ClinSync',
    subtitle: 'Check-in clínico de autoatendimento e triagem automatizada',
    returningBtn: 'Paciente Já Cadastrado',
    returningDesc: 'Acesse com ID do paciente, celular registrado ou biometria',
    newBtn: 'Novo Paciente',
    newDesc: 'Primeira vez na clínica? Cadastre seus dados em 2 minutos',
    staffBtn: 'Chamar Equipe de Apoio',
    staffDesc: 'Precisa de ajuda com cadastro, locomoção ou tradução?',
    emergency: 'Dor forte no peito, falta de ar ou dormência súbita? Toque aqui imediatamente.',
    privacyNote: 'Sua privacidade está protegida. A identidade é confirmada antes de qualquer histórico médico.',
    fastCheckInBadge: 'Check-in Rápido',
    registrationBadge: 'Cadastro',
  },

  // 10. Korean
  ko: {
    title: 'ClinSync 스마트 접수센터에 오신 것을 환영합니다',
    subtitle: '자가 문진 접수 및 스마트 환자 분류 시스템',
    returningBtn: '재진 환자 접수',
    returningDesc: '환자 번호, 등록된 휴대전화 번호 또는 생체 인증으로 간편 접수',
    newBtn: '초진 환자 등록',
    newDesc: '처음 방문하셨나요? 2분 만에 기본 인적사항을 등록하세요',
    staffBtn: '직원 호출 및 안내 요청',
    staffDesc: '접수 지원, 거동 보조 또는 통역 안내가 필요하신가요?',
    emergency: '극심한 흉통, 호흡 곤란 또는 갑작스러운 마비 증상이 있다면 즉시 여기를 누르세요.',
    privacyNote: '환자분의 개인정보는 안전하게 보호됩니다. 본인 인증 후 진료 기록이 표시됩니다.',
    fastCheckInBadge: '빠른 접수',
    registrationBadge: '신규 등록',
  },

  // 11. Hindi
  hi: {
    title: 'ClinSync स्वागत कक्ष में आपका स्वागत है',
    subtitle: 'स्वयं-सेवा क्लिनिकल चेक-इन और स्वचालित ट्राइएज सहायता',
    returningBtn: 'पुराने मरीज (लौटने वाले)',
    returningDesc: 'मरीज आईडी, मोबाइल नंबर या बायोमेट्रिक सत्यापन से चेक-इन करें',
    newBtn: 'नए मरीज पंजीकरण',
    newDesc: 'पहली बार आए हैं? केवल 2 मिनट में अपना विवरण दर्ज करें',
    staffBtn: 'अस्पताल स्टाफ सहायता',
    staffDesc: 'चेक-इन, व्हीलचेयर सहायता या भाषा अनुवाद में मदद चाहिए?',
    emergency: 'सीने में तेज दर्द, सांस लेने में तकलीफ या अचानक सुन्नपन? तुरंत यहाँ टैप करें।',
    privacyNote: 'आपकी गोपनीयता सुरक्षित है। पहचान सत्यापित होने से पहले कोई मेडिकल रिकॉर्ड नहीं दिखाया जाता।',
    fastCheckInBadge: 'त्वरित चेक-इन',
    registrationBadge: 'नया पंजीकरण',
  },

  // 12. Telugu
  te: {
    title: 'ClinSync రిసెప్షన్‌కు స్వాగతం',
    subtitle: 'స్వీయ క్లినికల్ చెక్-ఇన్ మరియు ఆటోమేటెడ్ ట్రయేజ్ సహాయం',
    returningBtn: 'గతంలో నమోదైన రోగి',
    returningDesc: 'రోగి ఐడీ, రిజిస్టర్డ్ మొబైల్ లేదా బయోమెట్రిక్ ద్వారా చెక్-ఇన్ అవ్వండి',
    newBtn: 'కొత్త రోగి నమోదు',
    newDesc: 'మొదటిసారి వస్తున్నారా? కేవలం 2 నిమిషాల్లో వివరాలు నమోదు చేసుకోండి',
    staffBtn: 'సిబ్బంది సహాయం కోరండి',
    staffDesc: 'చెక్-ఇన్, వీల్‌చైర్ లేదా భాషా అనువాదంలో సహాయం కావాలా?',
    emergency: 'తీవ్రమైన ఛాతీ నొప్పి, శ్వాస తీసుకోవడంలో ఇబ్బంది లేదా తిమ్మిరిగా ఉందా? వెంటనే ఇక్కడ నొక్కండి.',
    privacyNote: 'మీ గోప్యత సురక్షితం. గుర్తింపు ధృవీకరించిన తర్వాతే వైద్య వివరాలు చూపబడతాయి.',
    fastCheckInBadge: 'త్వరిత చెక్-ఇన్',
    registrationBadge: 'కొత్త నమోదు',
  },

  // 13. Tamil
  ta: {
    title: 'ClinSync வரவேற்பறைக்கு நல்வரவு',
    subtitle: 'சுய சேவை மருத்துவ பதிவு மற்றும் தானியங்கி ட்ரையേജ് உதவி',
    returningBtn: 'ஏற்கனவே பதிவுசெய்த நோயாளி',
    returningDesc: 'நோயாளி ஐடி, மொபைல் எண் அல்லது பயோமெட்ரிக் மூலம் உள்நுழைக',
    newBtn: 'புதிய நோயாளி பதிவு',
    newDesc: 'முதல் முறை வருகிறீர்களா? 2 நிமிடங்களில் விவரங்களை பதிவுசெய்யுங்கள்',
    staffBtn: 'பணியாளர் உதவி கோரவும்',
    staffDesc: 'பதிவு, நகர்வு உதவி அல்லது மொழிபெயர்ப்பில் உதவி தேவையா?',
    emergency: 'கடுமையான நெஞ்சு வலி, மூச்சுத்திணறல் அல்லது உணர்வின்மையா? உடனே இங்கே தட்டவும்.',
    privacyNote: 'உங்கள் தனியுரிமை பாதுகாப்பானது. அடையாளம் உறுதிப்படுத்தப்பட்ட பின்னரே பதிவுகள் காண்பிக்கப்படும்.',
    fastCheckInBadge: 'விரைவு பதிவு',
    registrationBadge: 'புதிய பதிவு',
  },

  // 14. Kannada
  kn: {
    title: 'ClinSync ಸ್ವಾಗತ ಕೇಂದ್ರಕ್ಕೆ ಸುಸ್ವಾಗತ',
    subtitle: 'ಸ್ವಯಂ ಕ್ಲಿನಿಕಲ್ ಚೆಕ್-ಇನ್ ಮತ್ತು ಸ್ವಯಂಚಾಲಿತ ಟ್ರಯೇಜ್ ನೆರವು',
    returningBtn: 'ಹಿಂದೆ ನೋಂದಾಯಿತ ರೋಗಿ',
    returningDesc: 'ರೋಗಿ ಐಡಿ, ನೋಂದಾಯಿತ ಮೊಬೈಲ್ ಅಥವಾ ಬಯೋಮೆಟ್ರಿಕ್ ಮೂಲಕ ಚೆಕ್-ಇನ್ ಮಾಡಿ',
    newBtn: 'ಹೊಸ ರೋಗಿ ನೋಂದಣಿ',
    newDesc: 'ಮೊದಲ ಬಾರಿ ಭೇಟಿ ನೀಡುತ್ತಿದ್ದೀರಾ? ಕೇವಲ 2 ನಿಮಿಷಗಳಲ್ಲಿ ವಿವರ ದಾಖಲಿಸಿ',
    staffBtn: 'ಸಿಬ್ಬಂದಿ ಸಹಾಯ ಕೋರಿ',
    staffDesc: 'ಚೆಕ್-ಇನ್, ಚಲನಶೀಲತೆ ಅಥವಾ ಭಾಷಾ ಅನುವಾದದಲ್ಲಿ ಸಹಾಯ ಬೇಕೇ?',
    emergency: 'ತೀವ್ರ ಎದೆನೋವು, ಉಸಿರಾಟದ ತೊಂದರೆ ಅಥವಾ ಹಠಾತ್ ಮರಗಟ್ಟುವಿಕೆಯೇ? ತಕ್ಷಣ ಇಲ್ಲಿ ಒತ್ತಿರಿ.',
    privacyNote: 'ನಿಮ್ಮ ಗೌಪ್ಯತೆ ಸುರಕ್ಷಿತವಾಗಿದೆ. ಗುರುತು ದೃಢೀಕರಿಸಿದ ನಂತರವೇ ವೈದ್ಯಕೀಯ ದಾಖಲೆ ತೋರಿಸಲಾಗುತ್ತದೆ.',
    fastCheckInBadge: 'ತ್ವರಿತ ಚೆಕ್-ಇನ್',
    registrationBadge: 'ಹೊಸ ನೋಂದಣಿ',
  },

  // 15. Bengali
  bn: {
    title: 'ClinSync অভ্যর্থনা কেন্দ্রে আপনাকে স্বাগতম',
    subtitle: 'স্বয়ংক্রিয় ক্লিনিকাল চেক-ইন এবং ট্রায়াজ সহায়তা',
    returningBtn: 'পূর্বে নিবন্ধিত রোগী',
    returningDesc: 'রোগী আইডি, মোবাইল নম্বর বা বায়োমেট্রিক স্ক্যান দিয়ে প্রবেশ করুন',
    newBtn: 'নতুন রোগী নিবন্ধন',
    newDesc: 'প্রথমবার এসেছেন? মাত্র ২ মিনিটে আপনার বিবরণ নিবন্ধন করুন',
    staffBtn: 'কর্মীদের সাহায্য চান',
    staffDesc: 'চেক-ইন, চলাচলের সহায়তা বা অনুবাদে সাহায্যের প্রয়োজন?',
    emergency: 'তীব্র বুকে ব্যথা, শ্বাসকষ্ট বা অসাড়তা অনুভব করছেন? অবিলম্বে এখানে স্পর্শ করুন।',
    privacyNote: 'আপনার গোপনীয়তা সুরক্ষিত। পরিচয় নিশ্চিত হওয়ার পরেই মেডিকেল রেকর্ড দেখানো হয়।',
    fastCheckInBadge: 'দ্রুত চেক-ইন',
    registrationBadge: 'নতুন নিবন্ধন',
  },

  // 16. Marathi
  mr: {
    title: 'ClinSync स्वागत कक्षामध्ये आपले स्वागत आहे',
    subtitle: 'स्वयं-सेवा क्लिनिकल चेक-इन आणि स्वयंचलित ट्रायज सहाय्य',
    returningBtn: 'पुनर्नोंदणीकृत रुग्ण',
    returningDesc: 'रुग्ण आयडी, नोंदणीकृत मोबाईल किंवा बायोमेट्रिकने चेक-इन करा',
    newBtn: 'नवीन रुग्ण नोंदणी',
    newDesc: 'पहिल्यांदाच येत आहात? अवघ्या २ मिनिटांत तपशील नोंदवा',
    staffBtn: 'कर्मचारी सहाय्य मागवा',
    staffDesc: 'चेक-इन, हालचाल मदत किंवा भाषांतरासाठी मदत हवी आहे का?',
    emergency: 'छातीत तीव्र वेदना, श्वास घेण्यास त्रास किंवा अचानक बधिरपणा? त्वरित येथे दाबा.',
    privacyNote: 'आपली गोपनीयता सुरक्षित आहे. ओळख पडताळणी झाल्यानंतरच वैद्यकीय नोंदी दिसतील.',
    fastCheckInBadge: 'जलद चेक-इन',
    registrationBadge: 'नवीन नोंदणी',
  },

  // 17. Gujarati
  gu: {
    title: 'ClinSync સ્વાગત કેન્દ્રમાં આપનું સ્વાગત છે',
    subtitle: 'સેલ્ફ-સર્વિસ ક્લિનિકલ ચેક-ઇન અને સ્વચાલિત ટ્રાયજ સહાય',
    returningBtn: 'અગાઉ નોંધાયેલા દર્દી',
    returningDesc: 'દર્દી આઈડી, નોંધાયેલ મોબાઈલ અથવા બાયોમેટ્રિક દ્વારા ચેક-ઇન કરો',
    newBtn: 'નવા દર્દી નોંધણી',
    newDesc: 'પ્રથમ વખત આવ્યા છો? માત્ર ૨ મિનિટમાં વિગતો નોંધાવો',
    staffBtn: 'સ્ટાફની સહાય મેળવો',
    staffDesc: 'ચેક-ઇન, વ્હીલચેેર અથવા ભાષા અનુવાદમાં મદદ જોઈએ છે?',
    emergency: 'છાતીમાં તીવ્ર દુખાવો, શ્વાસ લેવામાં તકલીફ કે અચાનક ખાલી ચડવી? તરત અહીં સ્પર્શ કરો.',
    privacyNote: 'આપની ગોપનીયતા સુરક્ષિત છે. ઓળખ ચકાસાયા પછી જ મેડિકલ રેકોર્ડ દર્શાવવામાં આવે છે.',
    fastCheckInBadge: 'ઝડપી ચેક-ઇન',
    registrationBadge: 'નવી નોંધણી',
  },

  // 18. Malayalam
  ml: {
    title: 'ClinSync-ലേക്ക് സ്വാഗതം',
    subtitle: 'സ്വയം ക്ലിനിക്കൽ ചെക്ക്-ഇൻ & ഓട്ടോമേറ്റഡ് ട്രയേജ് സഹായം',
    returningBtn: 'മുൻപ് രജിസ്റ്റർ ചെയ്ത രോഗി',
    returningDesc: 'പേഷ്യന്റ് ഐഡി, മൊബൈൽ നമ്പർ അല്ലെങ്കിൽ ബയോമെട്രിക് വഴി ചെക്ക്-ഇൻ ചെയ്യുക',
    newBtn: 'പുതിയ രോഗി രജിസ്ട്രേഷൻ',
    newDesc: 'ആദ്യമായി വരികയാണോ? 2 മിനിറ്റിനുള്ളിൽ വിവരങ്ങൾ രജിസ്റ്റർ ചെയ്യാം',
    staffBtn: 'ജീവനക്കാരുടെ സഹായം തേടുക',
    staffDesc: 'ചെക്ക്-ഇൻ, മൊബിലിറ്റി അല്ലെങ്കിൽ വിവർത്തന സഹായം ആവശ്യമുണ്ടോ?',
    emergency: 'കടുത്ത നെഞ്ചുവേദന, ശ്വാസതടസ്സം അല്ലെങ്കിൽ പെട്ടെന്നുള്ള മരവിപ്പ്? ഉടൻ ഇവിടെ അമർത്തുക.',
    privacyNote: 'നിങ്ങളുടെ സ്വകാര്യത പൂർണ്ണമായും സുരക്ഷിതമാണ്. തിരിച്ചറിയൽ ഉറപ്പാക്കിയ ശേഷം മാത്രമേ വിവരങ്ങൾ ലഭ്യമാകൂ.',
    fastCheckInBadge: 'ദ്രുത ചെക്ക്-ഇൻ',
    registrationBadge: 'പുതിയ രജിസ്ട്രേഷൻ',
  },
};

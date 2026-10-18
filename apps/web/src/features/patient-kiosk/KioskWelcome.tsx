import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import {
  UserCheck,
  UserPlus,
  HelpCircle,
  AlertTriangle,
  Globe,
  Eye,
  ShieldCheck,
  BellRing,
} from 'lucide-react';

interface KioskWelcomeProps {
  onSelectReturning: () => void;
  onSelectNew: () => void;
  onEmergencyEscalation: () => void;
}

export const KioskWelcome: React.FC<KioskWelcomeProps> = ({
  onSelectReturning,
  onSelectNew,
  onEmergencyEscalation,
}) => {
  const [language, setLanguage] = useState<'en' | 'es' | 'zh'>('en');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [isStaffHelpOpen, setIsStaffHelpOpen] = useState<boolean>(false);
  const [staffNotified, setStaffNotified] = useState<boolean>(false);

  const t = {
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
    },
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
    },
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
    },
  }[language];

  const handleCallStaff = () => {
    setStaffNotified(true);
    setTimeout(() => {
      setStaffNotified(false);
      setIsStaffHelpOpen(false);
    }, 2500);
  };

  return (
    <div
      data-testid="kiosk-welcome-container"
      className={`w-full max-w-4xl mx-auto space-y-6 transition-colors duration-200 ${
        highContrast ? 'contrast-125 text-black' : ''
      }`}
    >
      {/* Red-Flag Urgent Safety Alert Banner */}
      <div
        role="alert"
        data-testid="emergency-banner"
        onClick={onEmergencyEscalation}
        className="bg-rose-50 border-2 border-rose-400 hover:bg-rose-100/90 text-rose-900 px-5 py-3.5 rounded-xl flex items-center justify-between cursor-pointer shadow-sm transition-all active:scale-[0.99]"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-rose-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-700 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-sm uppercase tracking-wider block text-rose-800">
              Emergency Clinical Alert
            </span>
            <span className="text-sm font-medium">{t.emergency}</span>
          </div>
        </div>
        <Button variant="danger" size="sm" className="hidden sm:inline-flex shrink-0">
          Urgent Help
        </Button>
      </div>

      {/* Top Controls: Language & Accessibility */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 text-slate-700 text-sm font-medium">
          <Globe className="w-4 h-4 text-slate-500" />
          <span>Language / Idioma / 语言:</span>
          <div className="flex items-center space-x-1 ml-2">
            {(['en', 'es', 'zh'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                data-testid={`language-btn-${lang}`}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  language === lang
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setHighContrast(!highContrast)}
          data-testid="high-contrast-toggle"
          className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium border transition-colors ${
            highContrast
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
          }`}
          aria-label="Toggle High Contrast Mode"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>High Contrast</span>
        </button>
      </div>

      {/* Main Welcome Card */}
      <Card className="shadow-md border-slate-200/80 overflow-hidden">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 mb-3 border border-teal-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-slate-900">
            {t.title}
          </CardTitle>
          <CardDescription className="text-base text-slate-600 max-w-lg mx-auto mt-1">
            {t.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2 pb-8 px-6 md:px-12">
          {/* Action Choice 1: Returning Patient */}
          <button
            onClick={onSelectReturning}
            data-testid="returning-patient-btn"
            className="w-full text-left p-5 min-h-[80px] rounded-2xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 bg-white shadow-xs hover:shadow-md transition-all group flex items-start space-x-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserCheck className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900 group-hover:text-teal-900">
                  {t.returningBtn}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-700 bg-teal-100 px-2.5 py-0.5 rounded-full">
                  Fast Check-in
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{t.returningDesc}</p>
            </div>
          </button>

          {/* Action Choice 2: New Patient */}
          <button
            onClick={onSelectNew}
            data-testid="new-patient-btn"
            className="w-full text-left p-5 min-h-[80px] rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 bg-white shadow-xs hover:shadow-md transition-all group flex items-start space-x-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <UserPlus className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900 group-hover:text-indigo-900">
                  {t.newBtn}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  Registration
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{t.newDesc}</p>
            </div>
          </button>

          {/* Action Choice 3: Request Staff Assistance */}
          <button
            onClick={() => setIsStaffHelpOpen(true)}
            data-testid="staff-help-btn"
            className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-slate-50/60 transition-all flex items-center space-x-3 cursor-pointer"
          >
            <HelpCircle className="w-5 h-5 text-slate-500" />
            <div className="flex-1">
              <span className="text-sm font-semibold text-slate-800 block">
                {t.staffBtn}
              </span>
              <span className="text-xs text-slate-500">{t.staffDesc}</span>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* Privacy Notice Footer */}
      <div className="text-center text-xs text-slate-500 flex items-center justify-center space-x-1.5 pb-4">
        <ShieldCheck className="w-4 h-4 text-teal-600" />
        <span>{t.privacyNote}</span>
      </div>

      {/* Staff Assistance Dialog */}
      <Dialog
        isOpen={isStaffHelpOpen}
        onClose={() => setIsStaffHelpOpen(false)}
        title="Summon Staff Assistance"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-600">
            A triage nurse or front-desk coordinator will be alerted to assist you directly at Kiosk Station #01.
          </p>

          {staffNotified ? (
            <div className="p-4 bg-teal-50 border border-teal-200 text-teal-900 rounded-lg flex items-center space-x-3">
              <BellRing className="w-6 h-6 text-teal-600 animate-bounce" />
              <div>
                <p className="font-bold text-sm">Staff Alerted!</p>
                <p className="text-xs text-teal-700">A coordinator is on their way to your station.</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="outline" onClick={() => setIsStaffHelpOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCallStaff}>
                <BellRing className="w-4 h-4 mr-2" />
                Alert Desk Now
              </Button>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};

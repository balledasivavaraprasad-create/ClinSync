import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Clock,
  FileText,
  Calendar,
  Pill,
  ShieldCheck,
  Settings,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  Plus,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Heart,
  Activity,
  Globe,
  Bell,
} from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { apiClient } from '../../lib/api/client';
import type {
  PatientProfile,
  MedicalTimelineItem,
  PatientDocumentItem,
  PatientConsentStatus,
  ClinicalFact,
} from '../../lib/api/types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { DocumentViewerModal } from '../documents/DocumentViewerModal';
import { DocumentUploadZone, type UploadedDocItem } from '../documents/DocumentUploadZone';

export type ProfileSubTab =
  | 'personal'
  | 'overview'
  | 'timeline'
  | 'documents'
  | 'medications'
  | 'appointments'
  | 'consent'
  | 'settings';

export interface PatientProfileHubProps {
  patientId?: string;
  initialSubTab?: ProfileSubTab;
  isClinicianView?: boolean;
  onBookAppointment?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onBack?: () => void;
}

export const PatientProfileHub: React.FC<PatientProfileHubProps> = ({
  patientId = 'pat_synth_001',
  initialSubTab = 'personal',
  isClinicianView = false,
  onBookAppointment,
  onNavigateToTab,
  onBack,
}) => {
  const { isLight } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>(initialSubTab);
  
  // Data State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [facts, setFacts] = useState<ClinicalFact[]>([]);
  const [timeline, setTimeline] = useState<MedicalTimelineItem[]>([]);
  const [documents, setDocuments] = useState<PatientDocumentItem[]>([]);
  const [consent, setConsent] = useState<PatientConsentStatus | null>(null);

  // Edit Personal Information Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    contact_number: '',
    email: '',
    address: '',
    preferred_language: 'en-US',
    emergency_name: '',
    emergency_relationship: '',
    emergency_phone: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Document Viewer Modal State
  const [selectedDoc, setSelectedDoc] = useState<UploadedDocItem | null>(null);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [isUploadZoneOpen, setIsUploadZoneOpen] = useState(false);

  // Timeline Filter State
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'encounter' | 'diagnosis' | 'prescription' | 'investigation' | 'document'>('all');

  // Fetch Patient Profile & Clinical Data
  const fetchProfileData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.getPatientProfile(patientId);
      const data = res.data;
      setProfile(data.profile);
      setTimeline(data.timeline);
      setDocuments(data.documents);
      setConsent(data.consent);

      // Context facts
      const contextFacts: ClinicalFact[] = [
        ...(data.context.allergies || []),
        ...(data.context.active_medications || []),
        ...(data.context.recent_conditions || []),
      ];
      setFacts(contextFacts);

      // Initialize edit form
      setEditFormData({
        contact_number: data.profile.contact_number || '',
        email: data.profile.email || '',
        address: data.profile.address || '',
        preferred_language: data.profile.preferred_language || 'en-US',
        emergency_name: data.profile.emergency_contact?.name || '',
        emergency_relationship: data.profile.emergency_contact?.relationship || '',
        emergency_phone: data.profile.emergency_contact?.phone || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve patient profile records.');
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Sync initialSubTab if parent changes it
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Save Personal Info Updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSavingProfile(true);
    setSaveSuccessMessage(null);

    try {
      const updates: Partial<PatientProfile> = {
        contact_number: editFormData.contact_number.trim() || undefined,
        email: editFormData.email.trim() || undefined,
        address: editFormData.address.trim() || undefined,
        preferred_language: editFormData.preferred_language,
        emergency_contact: editFormData.emergency_name
          ? {
              name: editFormData.emergency_name.trim(),
              relationship: editFormData.emergency_relationship.trim() || 'Contact',
              phone: editFormData.emergency_phone.trim(),
            }
          : undefined,
      };

      const res = await apiClient.updatePatientProfile(patientId, updates);
      setProfile(res.data.profile);
      setSaveSuccessMessage('Personal demographics updated successfully and audited.');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveSuccessMessage(null);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update personal profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Toggle Patient Consent
  const handleToggleConsent = async (
    key: 'automated_intake_consent' | 'ehr_sharing_consent' | 'ai_triage_processing_consent'
  ) => {
    if (!consent) return;
    try {
      const updatedValue = !consent[key];
      const res = await apiClient.updatePatientConsent(patientId, { [key]: updatedValue });
      setConsent(res);
    } catch (err) {
      console.error('Failed to update consent status:', err);
    }
  };

  // Open Document Viewer
  const handleOpenDocViewer = (doc: PatientDocumentItem) => {
    setSelectedDoc({
      id: doc.id,
      name: doc.filename,
      size: doc.file_size_bytes,
      type: 'application/pdf',
      status: doc.status === 'VERIFIED' ? 'EXTRACTED' : doc.status,
      progress: 100,
      uploadedAt: doc.date,
      extractedFactIds: doc.extracted_fact_ids,
    });
    setIsDocViewerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] p-8">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
        <p className="text-sm font-semibold tracking-wide text-slate-400">
          Deciphering and loading verified clinical record vault...
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold">Failed to Load Patient Profile</h3>
        <p className="text-sm text-slate-400">{error || 'Patient record could not be found.'}</p>
        <Button onClick={fetchProfileData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Connection
        </Button>
      </div>
    );
  }

  const initials = profile.display_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'PT';

  const filteredTimeline = timeline.filter((item) => {
    if (timelineFilter === 'all') return true;
    return item.category === timelineFilter;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] pb-5">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-slate-300'
              }`}
            >
              Back to Console
            </button>
          )}

          <div className="flex items-center space-x-3.5">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-lg ${
                isLight
                  ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-cyan-600/20'
                  : 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/25 ring-2 ring-cyan-400/30'
              }`}
            >
              {initials}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">{profile.display_name}</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30">
                  {isClinicianView ? 'Hospital Master Record' : 'Patient Portal'}
                </span>
              </div>
              <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>MRN: <strong className="text-slate-900 dark:text-slate-200">{profile.hospital_id}</strong></span>
                <span>•</span>
                <span>Age: <strong className="text-slate-900 dark:text-slate-200">{profile.calculated_age || '44'} yrs</strong></span>
                <span>•</span>
                <span>Blood: <strong className="text-slate-900 dark:text-slate-200">{profile.blood_group || 'A+'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditModalOpen(true)}
            className="cursor-pointer"
            data-testid="btn-edit-profile"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" />
            Edit Demographics
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (onBookAppointment) {
                onBookAppointment();
              } else if (onNavigateToTab) {
                onNavigateToTab('appointments');
              } else {
                window.location.hash = '#/app/appointments';
              }
            }}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold cursor-pointer"
            data-testid="btn-book-consult"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Book Consultation
          </Button>
        </div>
      </div>

      {/* Subtab Navigation Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-white/[0.06]">
        {[
          { id: 'personal', label: 'Personal Information', icon: User },
          { id: 'overview', label: 'Medical Overview', icon: Heart },
          { id: 'timeline', label: 'Medical History Timeline', icon: Clock },
          { id: 'documents', label: 'My Documents', icon: FileText, count: documents.length },
          { id: 'medications', label: 'Medications & Allergies', icon: Pill },
          { id: 'appointments', label: 'My Appointments', icon: Calendar },
          { id: 'consent', label: 'Consent & Privacy', icon: ShieldCheck },
          { id: 'settings', label: 'Account Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as ProfileSubTab)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? isLight
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
              data-testid={`subtab-${tab.id}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? isLight
                        ? 'bg-white text-cyan-700'
                        : 'bg-cyan-400 text-slate-950'
                      : isLight
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tabbed Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="space-y-6"
        >
          {/* ========================================================
              1. PERSONAL INFORMATION SUBTAB
              ======================================================== */}
          {activeSubTab === 'personal' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Identity & Demographics Monolith */}
              <div
                className={`lg:col-span-2 p-6 rounded-2xl border ${
                  isLight
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-white/[0.02] border-white/[0.08] backdrop-blur-xl'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-4 mb-5">
                  <div className="flex items-center space-x-2.5">
                    <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Patient Demographics & Identifiers
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Identity Verified (Biometric + DOB)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Full Legal Name</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{profile.display_name}</p>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Medical Record Number (MRN)</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-500/30">
                        {profile.hospital_id}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Immutable / Protected</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Date of Birth & Age</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                      {profile.date_of_birth || 'May 12, 1982'} ({profile.calculated_age || 44} years)
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Blood Type</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                      {profile.blood_group || 'A-Positive (A+)'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Contact Phone</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>{profile.contact_number || 'Not provided'}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Email Address</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>{profile.email || 'Not provided'}</span>
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Residential Address</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>{profile.address || 'Not provided'}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Preferred Spoken Language</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200 flex items-center space-x-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>{profile.preferred_language === 'en-US' ? 'English (United States)' : profile.preferred_language}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-1">Primary Health Insurance</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                      {profile.insurance_provider || 'Blue Cross Blue Shield'}
                    </p>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      ID: {profile.insurance_id || 'BCBS-8829104-A'}
                    </span>
                  </div>
                </div>

                {/* Emergency Contact Sub-card */}
                <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/[0.08]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 mb-3 flex items-center space-x-2">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Emergency Contact Information</span>
                  </h4>
                  {profile.emergency_contact ? (
                    <div
                      className={`p-3.5 rounded-xl border flex items-center justify-between ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-200">
                          {profile.emergency_contact.name}{' '}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                            ({profile.emergency_contact.relationship})
                          </span>
                        </div>
                        <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                          {profile.emergency_contact.phone}
                        </div>
                      </div>
                      <Badge variant="success" className="text-[10px]">
                        Primary Next of Kin
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No emergency contact currently recorded.</p>
                  )}
                </div>
              </div>

              {/* Security & Access Protection Card */}
              <div className="space-y-6">
                <div
                  className={`p-6 rounded-2xl border ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center space-x-2 text-cyan-400 mb-3">
                    <ShieldCheck className="w-5 h-5" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Protected Health Identity
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Under hospital safety governance, critical clinical fields (MRN, physician-confirmed
                    diagnoses, and prescription history) are immutable through self-service to prevent
                    accidental medical record corruption.
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Record Status:</span>
                      <strong className="text-emerald-400">Active & Confirmed</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Authentication:</span>
                      <strong className="text-slate-200">Biometric Candidate Token</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Audit Compliance:</span>
                      <strong className="text-cyan-400">HIPAA Title II Sealed</strong>
                    </div>
                  </div>
                </div>

                {/* Quick Link to Appointments */}
                <div
                  className={`p-5 rounded-2xl border bg-gradient-to-br ${
                    isLight
                      ? 'from-cyan-50 to-blue-50 border-cyan-200 text-slate-800'
                      : 'from-cyan-950/20 to-blue-950/20 border-cyan-500/30 text-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">
                    Need Clinical Assistance?
                  </h4>
                  <p className="text-xs text-slate-400 mb-3">
                    Schedule an outpatient consultation with Dr. Clara Chen (Cardiology) or Dr. Marcus Vance.
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                    onClick={() => setActiveSubTab('appointments')}
                  >
                    View Available Slots
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              2. MEDICAL OVERVIEW SUBTAB
              ======================================================== */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Provenance Legend Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300">
                  <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Clinical Provenance & Certainty Ledger</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-medium">
                    Clinician Confirmed
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 font-medium">
                    Patient Reported
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 font-medium">
                    AI Multimodal Extracted
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-medium">
                    Historical EHR
                  </span>
                </div>
              </div>

              {/* 3 Overview Columns: Conditions, Allergies, Medications */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Documented Conditions */}
                <div
                  className={`p-5 rounded-2xl border ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3 mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span>Diagnoses & Conditions</span>
                    </h3>
                    <Badge variant="neutral" className="text-[10px]">
                      {facts.filter((f) => f.fact_type === 'condition' || f.fact_type === 'symptom').length || 2} Recorded
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-950/10">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-200">
                        <span>Acute Retrosternal Chest Tightness</span>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">Presenting</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Reported onset 3 days prior. Non-radiating, exacerbated by exertion.
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30">
                          Patient Reported
                        </span>
                        <span className="text-slate-500 font-mono">Turn 1 Voice Intake</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-950/10">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-200">
                        <span>Essential Hypertension</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Managed</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Long-term outpatient management with Lisinopril 10mg daily.
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                          EHR Confirmed
                        </span>
                        <span className="text-slate-500 font-mono">Dr. Miller (2021)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Documented Allergies */}
                <div
                  className={`p-5 rounded-2xl border ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3 mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Documented Allergies</span>
                    </h3>
                    <Badge variant="error" className="text-[10px]">
                      High Alert
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/20">
                      <div className="flex items-center justify-between text-xs font-bold text-rose-900 dark:text-rose-300">
                        <span>Penicillin (Systemic)</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold">
                          CRITICAL
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">
                        Severe hives and acute facial angioedema observed following oral administration.
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                          Physician Verified
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono">EHR Ref 9921</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02]">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-200">
                        <span>No Other Known Food/Latex Allergies</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Patient denied seafood, peanut, or environmental anaphylactic reactions.
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30">
                          Patient Reported
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Active Medications */}
                <div
                  className={`p-5 rounded-2xl border ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3 mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 flex items-center space-x-2">
                      <Pill className="w-4 h-4 text-cyan-600 dark:text-cyan-500" />
                      <span>Active Medications</span>
                    </h3>
                    <Badge variant="info" className="text-[10px]">
                      1 Active Rx
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50/70 dark:bg-cyan-950/20">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-200">
                        <span>Lisinopril</span>
                        <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-semibold">10 mg Oral</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                        Frequency: Once daily in morning. Indication: Blood pressure maintenance.
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-[10px]">
                        <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30">
                          OCR Extracted
                        </span>
                        <span className="text-slate-500 font-mono">St. Jude Pharmacy</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              3. MEDICAL HISTORY TIMELINE SUBTAB
              ======================================================== */}
          {activeSubTab === 'timeline' && (
            <div className="space-y-5">
              {/* Category Filter Pills */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: 'All Records' },
                  { id: 'encounter', label: 'Consultations' },
                  { id: 'investigation', label: 'Diagnostics & Vitals' },
                  { id: 'prescription', label: 'Prescriptions' },
                  { id: 'document', label: 'EHR Documents' },
                  { id: 'diagnosis', label: 'Diagnoses' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTimelineFilter(item.id as typeof timelineFilter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      timelineFilter === item.id
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Vertical Chronological Stepper */}
              <div className="relative pl-6 sm:pl-8 border-l border-white/[0.12] space-y-6">
                {filteredTimeline.map((item) => {
                  const isConfirmed = item.provenance_type === 'clinician_confirmed';
                  const isReported = item.provenance_type === 'patient_reported';
                  const isExtracted = item.provenance_type === 'ai_extracted';

                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 ${
                          isConfirmed
                            ? 'bg-emerald-500 border-[#070a14] ring-2 ring-emerald-500/40'
                            : isReported
                            ? 'bg-blue-500 border-[#070a14] ring-2 ring-blue-500/40'
                            : isExtracted
                            ? 'bg-purple-500 border-[#070a14] ring-2 ring-purple-500/40'
                            : 'bg-cyan-500 border-[#070a14] ring-2 ring-cyan-500/40'
                        }`}
                      />

                      {/* Content Card */}
                      <div
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isLight
                            ? 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                            : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.08]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                          <h4 className="text-sm font-bold text-slate-100">{item.title}</h4>
                          <span className="text-xs font-mono text-slate-400">
                            {new Date(item.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{item.description}</p>

                        <div className="flex items-center space-x-3 mt-3 pt-3 border-t border-slate-200 dark:border-white/[0.06] text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded font-semibold uppercase tracking-wider text-[10px] ${
                              isConfirmed
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                                : isReported
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30'
                            }`}
                          >
                            {item.provenance_type.replace('_', ' ')}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Source: <strong className="text-slate-900 dark:text-slate-300">{item.source}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              4. MY DOCUMENTS SUBTAB
              ======================================================== */}
          {activeSubTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300">
                    Clinical Document Archive
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Prescription scans, ambulatory ECG records, and laboratory discharge summaries
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsUploadZoneOpen(!isUploadZoneOpen)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Upload New Document
                </Button>
              </div>

              {/* Expandable Upload Zone */}
              {isUploadZoneOpen && (
                <div
                  className={`p-5 rounded-2xl border ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-white/[0.02] border-white/[0.1]'
                  }`}
                >
                  <DocumentUploadZone
                    encounterId="enc_demo_001"
                    onDocumentExtracted={(documentId: string, extractedFactIds: string[]) => {
                      setDocuments((prev) => [
                        {
                          id: documentId,
                          title: 'Diagnostic Document Ingestion',
                          filename: `upload_${documentId}.pdf`,
                          category: 'clinical_note',
                          date: new Date().toISOString(),
                          status: 'PROCESSING',
                          file_size_bytes: 450000,
                          extracted_fact_ids: extractedFactIds,
                          uploaded_by: 'Patient Direct Upload',
                        },
                        ...prev,
                      ]);
                      setIsUploadZoneOpen(false);
                    }}
                  />
                </div>
              )}

              {/* Documents Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isLight
                        ? 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                        : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.08]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200 line-clamp-1">
                              {doc.title}
                            </h4>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {doc.filename}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            doc.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                              : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                        <div>
                          <span>Date: </span>
                          <strong className="text-slate-900 dark:text-slate-300">
                            {new Date(doc.date).toLocaleDateString()}
                          </strong>
                        </div>
                        <div>
                          <span>Size: </span>
                          <strong className="text-slate-900 dark:text-slate-300 font-mono">
                            {(doc.file_size_bytes / 1024).toFixed(0)} KB
                          </strong>
                        </div>
                        <div className="col-span-2">
                          <span>Source: </span>
                          <strong className="text-slate-900 dark:text-slate-300">{doc.uploaded_by}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDocViewer(doc)}
                        className="flex-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Preview Document
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          // Download simulated attachment
                          const element = document.createElement('a');
                          const file = new Blob([`ClinSync Synthetic Clinical Document: ${doc.title}\nPatient: ${profile.display_name}\nMRN: ${profile.hospital_id}`], { type: 'text/plain' });
                          element.href = URL.createObjectURL(file);
                          element.download = doc.filename;
                          document.body.appendChild(element);
                          element.click();
                          document.body.removeChild(element);
                        }}
                        className="cursor-pointer"
                        title="Download Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              5. MEDICATIONS & ALLERGIES SUBTAB
              ======================================================== */}
          {activeSubTab === 'medications' && (
            <div className="space-y-6">
              {/* Conflict / Safety Alert Card */}
              <div
                className={`p-4 rounded-xl border flex items-start space-x-3 ${
                  isLight
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold uppercase tracking-wider">
                    Automated Pharmacological Safety Check
                  </h4>
                  <p className="mt-0.5 leading-relaxed">
                    Patient has a verified severe anaphylactoid allergy to <strong>Penicillin</strong>.
                    Prescribing Beta-Lactam antibiotics (Amoxicillin, Ampicillin, Piperacillin) is flagged
                    in the clinician order entry system. Lisinopril exhibits no known cross-reactivity.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Prescriptions */}
                <div
                  className={`p-5 rounded-2xl border ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/[0.08]'
                  }`}
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-4 flex items-center space-x-2">
                    <Pill className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Active Prescriptions</span>
                  </h3>

                  <div className="p-4 rounded-xl border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50/70 dark:bg-cyan-950/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Lisinopril</span>
                      <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400">10 mg Oral Tablet</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <div>Sig: Take 1 tablet by mouth daily every morning with water.</div>
                      <div>Indication: Hypertension & Cardioprotective therapy</div>
                      <div>Prescribed by: Dr. Marcus Vance, MD (Cardiology)</div>
                      <div>Refills: 2 remaining at St. Jude Hospital Pharmacy</div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Status: ACTIVE</span>
                    </div>
                  </div>
                </div>

                {/* Documented Allergies */}
                <div
                  className={`p-5 rounded-2xl border ${
                    isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/[0.08]'
                  }`}
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-4 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>Known Adverse Reactions</span>
                  </h3>

                  <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-rose-900 dark:text-rose-300">Penicillin (All Classes)</span>
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase">Severe / Anaphylactoid</span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <div>Reaction: Urticaria (diffuse hives), facial angioedema, lightheadedness</div>
                      <div>Recorded: April 2021 (Emergency Department Ingestion)</div>
                      <div>Verification: Attending Physician Dr. Miller</div>
                    </div>
                    <div className="pt-2 flex justify-end">
                      <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-semibold">Contraindicated in EHR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              6. MY APPOINTMENTS SUBTAB
              ======================================================== */}
          {activeSubTab === 'appointments' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300">
                    Patient Consultation Schedule
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review upcoming appointments or reserve a new clinical consultation slot
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (onBookAppointment) {
                      onBookAppointment();
                    } else if (onNavigateToTab) {
                      onNavigateToTab('appointments');
                    } else {
                      window.location.hash = '#/app/appointments';
                    }
                  }}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Schedule New Appointment
                </Button>
              </div>

              {/* Upcoming Appointment Card */}
              <div
                className={`p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-br ${
                  isLight
                    ? 'from-cyan-50 to-white shadow-sm'
                    : 'from-cyan-950/30 to-blue-950/20 shadow-lg'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-cyan-500/20 pb-4 mb-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      Next Scheduled Appointment
                    </span>
                    <h4 className="text-base font-bold text-slate-100 mt-0.5">
                      Cardiology Outpatient Evaluation
                    </h4>
                    <p className="text-xs text-slate-400">
                      Dr. Clara Chen, MD • Department of Cardiology & Chest Pain
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs">
                    Confirmed
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Date & Time</span>
                    <strong className="text-slate-200">Today • 10:30 AM</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Location</span>
                    <strong className="text-slate-200">Main Pavilion, Room 402B</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Check-in Status</span>
                    <strong className="text-cyan-400">Intake Kiosk Complete</strong>
                  </div>
                </div>
              </div>

              {/* Past Consultations */}
              <div
                className={`p-5 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/[0.08]'
                }`}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Historical Consultations
                </h4>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-white/[0.06] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-200">Routine Annual Health Checkup</div>
                      <div className="text-slate-400 mt-0.5">
                        Dr. Marcus Vance • Internal Medicine • Sept 15, 2026
                      </div>
                    </div>
                    <Badge variant="neutral" className="text-[10px] text-slate-400">
                      Completed
                    </Badge>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/[0.06] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-200">Hypertension Medication Review</div>
                      <div className="text-slate-400 mt-0.5">
                        Dr. Clara Chen • Cardiology • Oct 4, 2026
                      </div>
                    </div>
                    <Badge variant="neutral" className="text-[10px] text-slate-400">
                      Completed
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              7. CONSENT & PRIVACY SUBTAB
              ======================================================== */}
          {activeSubTab === 'consent' && (
            <div className="space-y-6">
              <div
                className={`p-6 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/[0.08]'
                }`}
              >
                <div className="flex items-center space-x-2 text-cyan-400 mb-2">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    HIPAA Compliance & Electronic Consent Vault
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Manage your data processing permissions, electronic health record interoperability,
                  and AI clinical assistance authorizations. Changes are cryptographically logged with
                  audit timestamps.
                </p>

                {consent && (
                  <div className="space-y-4">
                    {/* Toggle 1: Automated Intake */}
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
                      }`}
                    >
                      <div className="max-w-xl">
                        <div className="text-xs font-bold text-slate-200">
                          Automated Kiosk & Tablet Intake Consent
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Allows conversational voice check-in and dynamic symptom localization questions
                          at hospital intake stations.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleConsent('automated_intake_consent')}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                          consent.automated_intake_consent ? 'bg-cyan-500' : 'bg-slate-700'
                        }`}
                        aria-label="Toggle automated intake consent"
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                            consent.automated_intake_consent ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle 2: EHR Sharing */}
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
                      }`}
                    >
                      <div className="max-w-xl">
                        <div className="text-xs font-bold text-slate-200">
                          Health Information Exchange (HIE) & EHR Interoperability
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Authorizes encrypted clinical reconciliation with primary care facilities and
                          partner outpatient laboratories.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleConsent('ehr_sharing_consent')}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                          consent.ehr_sharing_consent ? 'bg-cyan-500' : 'bg-slate-700'
                        }`}
                        aria-label="Toggle EHR sharing consent"
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                            consent.ehr_sharing_consent ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle 3: AI Triage Assistance */}
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/[0.06]'
                      }`}
                    >
                      <div className="max-w-xl">
                        <div className="text-xs font-bold text-slate-200">
                          AI Multimodal Triage & Audio Brief Synthesis
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Permits Gemini multimodal extraction on uploaded documents and 60-second audio
                          hand-off generation for the attending doctor.
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleConsent('ai_triage_processing_consent')}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                          consent.ai_triage_processing_consent ? 'bg-cyan-500' : 'bg-slate-700'
                        }`}
                        aria-label="Toggle AI triage processing consent"
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                            consent.ai_triage_processing_consent ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Audit Signature Proof */}
                <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <span>Last Audited: {new Date(consent?.last_updated || Date.now()).toUTCString()}</span>
                  <span className="text-cyan-400">Signature: sha256:7e98a12b48ec901f...</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              8. ACCOUNT SETTINGS SUBTAB
              ======================================================== */}
          {activeSubTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Language & Regional Settings */}
              <div
                className={`p-5 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/[0.08]'
                }`}
              >
                <div className="flex items-center space-x-2 text-cyan-400 mb-4">
                  <Globe className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Language & Regional Preferences
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Display & Voice Language</label>
                    <select
                      value={profile.preferred_language}
                      onChange={async (e) => {
                        const newLang = e.target.value;
                        const res = await apiClient.updatePatientProfile(patientId, {
                          preferred_language: newLang,
                        });
                        setProfile(res.data.profile);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-xs cursor-pointer ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-[#090d19] border-white/10 text-slate-100'
                      }`}
                    >
                      <option value="en-US">English (United States)</option>
                      <option value="es-MX">Español (América Latina)</option>
                      <option value="zh-CN">中文 (Mandarin)</option>
                      <option value="hi-IN">हिन्दी (Hindi)</option>
                      <option value="vi-VN">Tiếng Việt (Vietnamese)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div
                className={`p-5 rounded-2xl border ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/[0.08]'
                }`}
              >
                <div className="flex items-center space-x-2 text-cyan-400 mb-4">
                  <Bell className="w-4 h-4" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Notification Preferences
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-cyan-500" />
                    <span className="text-slate-300">SMS appointment reminders 24 hours prior</span>
                  </label>
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-cyan-500" />
                    <span className="text-slate-300">Email notification when lab results are verified</span>
                  </label>
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-cyan-500" />
                    <span className="text-slate-300">Doctor brief audio handoff ready alert</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Edit Demographics Modal Dialog */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Patient Demographics"
        className="max-w-lg"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          {saveSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          <div>
            <label className="text-slate-400 block mb-1">Contact Phone Number</label>
            <input
              type="text"
              value={editFormData.contact_number}
              onChange={(e) => setEditFormData({ ...editFormData, contact_number: e.target.value })}
              className={`w-full p-2.5 rounded-xl border text-xs ${
                isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#090d19] border-white/10'
              }`}
              placeholder="(555) 000-0000"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Email Address</label>
            <input
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              className={`w-full p-2.5 rounded-xl border text-xs ${
                isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#090d19] border-white/10'
              }`}
              placeholder="patient@example.com"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Residential Address</label>
            <input
              type="text"
              value={editFormData.address}
              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              className={`w-full p-2.5 rounded-xl border text-xs ${
                isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#090d19] border-white/10'
              }`}
              placeholder="Street address, City, State, ZIP"
            />
          </div>

          <div className="pt-2 border-t border-white/[0.08]">
            <h5 className="font-bold text-slate-300 mb-2">Emergency Contact</h5>
            <div className="space-y-2">
              <input
                type="text"
                value={editFormData.emergency_name}
                onChange={(e) => setEditFormData({ ...editFormData, emergency_name: e.target.value })}
                className={`w-full p-2.5 rounded-xl border text-xs ${
                  isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#090d19] border-white/10'
                }`}
                placeholder="Full Name (e.g. Robert Johnson)"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={editFormData.emergency_relationship}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, emergency_relationship: e.target.value })
                  }
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#090d19] border-white/10'
                  }`}
                  placeholder="Relationship (e.g. Spouse)"
                />
                <input
                  type="text"
                  value={editFormData.emergency_phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, emergency_phone: e.target.value })
                  }
                  className={`w-full p-2.5 rounded-xl border text-xs ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#090d19] border-white/10'
                  }`}
                  placeholder="Emergency Phone"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSavingProfile}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
            >
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isDocViewerOpen}
        onClose={() => setIsDocViewerOpen(false)}
        document={selectedDoc}
      />
    </div>
  );
};

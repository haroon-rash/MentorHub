import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import AnimatedSection from '../../components/ui/AnimatedSection.jsx';
import MultiSelectPills from '../../components/ui/MultiSelectPills.jsx';
import CustomTimeSlotEditor from '../../components/ui/CustomTimeSlotEditor.jsx';
import {
  fetchTutorOnboardingProfile,
  upsertTutorOnboardingProfile,
  uploadProfilePicture,
  uploadDocument,
} from '../../services/authApi.js';
import {
  clearLegacyTutorOnboardingDraft,
  loadTutorOnboardingDraft,
  resolveAuthUserId,
  resolveSessionEmail,
  saveTutorOnboardingDraft,
} from '../../utils/tutorOnboardingStorage.js';
import {
  HIGHEST_DEGREES,
  TEACHING_METHODOLOGIES,
} from '../../data/onboardingConstants.js';
import { usePlatformCatalog } from '../../hooks/usePlatformCatalog.js';
import { validateBudgetField } from '../../utils/validation.js';

import { useAuth } from '../../context/AuthContext.jsx';
import { Role } from '../../constants/roles.js';
import { resolvePublicAssetUrl } from '../../utils/urls.js';
import RejectedBanner from '../../components/tutor/RejectedBanner.jsx';

const MotionButton = motion.button;
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const steps = [
  { id: 1, title: 'Identity & Education' },
  { id: 2, title: 'Teaching Details' },
  { id: 3, title: 'Verification' },
  { id: 4, title: 'Policies' },
];

const initialForm = {
  fullName: '',
  email: '',
  phoneNumber: '',
  profilePhotoUrl: '',
  highestDegree: '',
  fieldOfStudy: '',
  institutionName: '',
  graduationYear: '',
  degreeCertificateUrl: '',
  subjects: [],
  gradeLevels: [],
  yearsOfExperience: '',
  languages: [],
  teachingMode: 'Online',
  inPersonLocation: '',
  hourlyFee: '',
  monthlyFee: '',
  availableDays: [],
  availableTimeSlots: [],
  unavailableDates: [],
  bio: '',
  teachingMethodology: '',
  achievements: '',
  governmentIdType: 'Cnic',
  governmentIdDocumentUrl: '',
  backgroundCheckConsent: false,
  teachingLicensesOrCertificatesUrl: '',
  termsAccepted: false,
  privacyAccepted: false,
  commissionPolicyAccepted: false,
};

function toList(value) {
  if (Array.isArray(value)) return value;
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function TutorOnboarding({ manageMode = false, initialStep = 1 }) {
  const { catalog } = usePlatformCatalog();
  const formRef = React.useRef(null);
  const { token, name, email, role, userId, tutorStatus, tutorStatusLoading, refreshTutorStatus } = useAuth();

  const authUserId = useMemo(
    () => resolveAuthUserId(token, userId),
    [token, userId],
  );
  const sessionEmail = useMemo(
    () => resolveSessionEmail(token, email),
    [token, email],
  );

  const [form, setForm] = useState(() => {
    clearLegacyTutorOnboardingDraft();
    const draftUserId = resolveAuthUserId(token, userId);
    const saved = loadTutorOnboardingDraft(draftUserId);
    const lockedEmail = resolveSessionEmail(token, email);
    const isTutor = role?.toUpperCase() === Role.TUTOR;
    const base = {
      ...initialForm,
      fullName: isTutor ? (name || '') : '',
      email: lockedEmail || '',
    };
    if (!saved) return base;
    const { email: _draftEmail, ...draftRest } = saved;
    return { ...base, ...draftRest, email: lockedEmail || base.email };
  });

  const [isEditMode, setIsEditMode] = useState(false);

  const [statusCard, setStatusCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(initialStep);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    if (!sessionEmail) return;
    setForm((prev) => (prev.email === sessionEmail ? prev : { ...prev, email: sessionEmail }));
  }, [sessionEmail]);

  useEffect(() => {
    let active = true;
    const loadExisting = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await fetchTutorOnboardingProfile(token);
        if (active && profile) {
          setStatusCard(profile);
          setForm((prev) => ({
            ...prev,
            fullName: profile.fullName || prev.fullName,
            email: sessionEmail || profile.email || prev.email,
            phoneNumber: profile.phoneNumber || prev.phoneNumber,
            profilePhotoUrl: profile.profilePhotoUrl || prev.profilePhotoUrl,
            highestDegree: profile.highestDegree || prev.highestDegree,
            fieldOfStudy: profile.fieldOfStudy || prev.fieldOfStudy,
            institutionName: profile.institutionName || prev.institutionName,
            graduationYear: profile.graduationYear || prev.graduationYear,
            degreeCertificateUrl: profile.degreeCertificateUrl || prev.degreeCertificateUrl,
            subjects: Array.isArray(profile.subjects) ? profile.subjects : prev.subjects,
            gradeLevels: Array.isArray(profile.gradeLevels) ? profile.gradeLevels : prev.gradeLevels,
            yearsOfExperience: profile.yearsOfExperience || prev.yearsOfExperience,
            languages: Array.isArray(profile.languages) ? profile.languages : prev.languages,
            teachingMode: profile.teachingMode || prev.teachingMode,
            inPersonLocation: profile.inPersonLocation || prev.inPersonLocation,
            hourlyFee: profile.hourlyFee || prev.hourlyFee,
            monthlyFee: profile.monthlyFee || prev.monthlyFee,
            availableDays: Array.isArray(profile.availableDays) ? profile.availableDays : prev.availableDays,
            availableTimeSlots: Array.isArray(profile.availableTimeSlots) ? profile.availableTimeSlots : prev.availableTimeSlots,
            unavailableDates: Array.isArray(profile.unavailableDates) ? profile.unavailableDates : prev.unavailableDates,
            bio: profile.bio || prev.bio,
            teachingMethodology: profile.teachingMethodology || prev.teachingMethodology,
            achievements: profile.achievements || prev.achievements,
            governmentIdType: profile.governmentIdType || prev.governmentIdType,
            governmentIdDocumentUrl: profile.governmentIdDocumentUrl || prev.governmentIdDocumentUrl,
            backgroundCheckConsent: profile.backgroundCheckConsent || prev.backgroundCheckConsent,
            teachingLicensesOrCertificatesUrl: profile.teachingLicensesOrCertificatesUrl || prev.teachingLicensesOrCertificatesUrl,
            termsAccepted: profile.termsAccepted || prev.termsAccepted,
            privacyAccepted: profile.privacyAccepted || prev.privacyAccepted,
            commissionPolicyAccepted: profile.commissionPolicyAccepted || prev.commissionPolicyAccepted,
          }));
        }
      } catch (error) {
        console.debug('Tutor profile load failed:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadExisting();
    return () => { active = false; };
  }, [token, sessionEmail]);

  const completeness = useMemo(() => {
    const checks = [
      form.profilePhotoUrl, form.fullName, form.email, form.phoneNumber,
      form.highestDegree, form.fieldOfStudy, form.institutionName, form.graduationYear,
      form.degreeCertificateUrl, form.subjects, form.gradeLevels, form.languages,
      form.hourlyFee, form.availableDays, form.availableTimeSlots, form.bio,
      form.teachingMethodology, form.governmentIdDocumentUrl, form.backgroundCheckConsent,
      form.termsAccepted, form.privacyAccepted, form.commissionPolicyAccepted,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [form]);

  useEffect(() => {
    if (!authUserId) return;
    saveTutorOnboardingDraft(authUserId, form);
  }, [form, authUserId]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (key, file) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error('Please select a file smaller than 10MB');
      return;
    }
    try {
      setSaving(true);
      if (key === 'profilePhotoUrl') {
        const uploaded = await uploadProfilePicture(file, token);
        const url = typeof uploaded === 'string' ? uploaded : (uploaded?.url || uploaded?.Url || '');
        setField(key, url);
        toast.success('Profile photo uploaded and saved');
      } else {
        const uploaded = await uploadDocument(file, token);
        const url = typeof uploaded === 'string' ? uploaded : (uploaded?.url || uploaded?.Url || '');
        setField(key, url);
        toast.success('Document uploaded successfully');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to process file');
    } finally {
      setSaving(false);
    }
  };

  const handleNextStep = () => {
    if (formRef.current && formRef.current.reportValidity()) {
      setStep((prev) => Math.min(4, prev + 1));
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!token) {
      toast.error('You need to sign in first');
      return;
    }
    if (!form.termsAccepted || !form.privacyAccepted || !form.commissionPolicyAccepted) {
      toast.error('Accept all policy checkboxes before submitting');
      return;
    }
    const hourlyError = validateBudgetField(form.hourlyFee, 'Hourly fee');
    if (hourlyError) {
      toast.error(hourlyError);
      return;
    }
    if (form.monthlyFee) {
      const monthlyError = validateBudgetField(form.monthlyFee, 'Monthly fee');
      if (monthlyError) {
        toast.error(monthlyError);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: sessionEmail || form.email,
        phoneNumber: form.phoneNumber,
        profilePhotoUrl: form.profilePhotoUrl,
        highestDegree: form.highestDegree,
        fieldOfStudy: form.fieldOfStudy,
        institutionName: form.institutionName,
        graduationYear: Number(form.graduationYear || 0),
        degreeCertificateUrl: form.degreeCertificateUrl,
        subjects: toList(form.subjects).filter((s) => s !== 'Other'),
        gradeLevels: toList(form.gradeLevels),
        yearsOfExperience: Number(form.yearsOfExperience || 0),
        languages: toList(form.languages).filter((l) => l !== 'Other'),
        teachingMode: form.teachingMode,
        inPersonLocation: form.inPersonLocation,
        hourlyFee: Number(form.hourlyFee || 0),
        monthlyFee: form.monthlyFee ? Number(form.monthlyFee) : null,
        availableDays: toList(form.availableDays),
        availableTimeSlots: toList(form.availableTimeSlots),
        unavailableDates: toList(form.unavailableDates),
        bio: form.bio,
        teachingMethodology: form.teachingMethodology,
        achievements: form.achievements,
        governmentIdType: form.governmentIdType,
        governmentIdDocumentUrl: form.governmentIdDocumentUrl,
        backgroundCheckConsent: form.backgroundCheckConsent,
        teachingLicensesOrCertificatesUrl: form.teachingLicensesOrCertificatesUrl,
        termsAccepted: form.termsAccepted,
        privacyAccepted: form.privacyAccepted,
        commissionPolicyAccepted: form.commissionPolicyAccepted,
      };
      const result = await upsertTutorOnboardingProfile({ token, payload });
      setStatusCard(result);
      await refreshTutorStatus();
      toast.success('Tutor profile submitted for verification');
      setIsEditMode(false);
    } catch (error) {
      toast.error(error.message || 'Failed to submit onboarding form');
    } finally {
      setSaving(false);
    }
  };

  // Tutor-only route enforced by ProtectedRoute.

  if (tutorStatusLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!manageMode && String(tutorStatus || '').toUpperCase() === 'APPROVED') {
    return <Navigate to="/tutor-dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <AnimatedSection className="glass-panel rounded-3xl p-6 sm:p-8" delay={0.04}>
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
          {manageMode ? 'Profile management' : 'Tutor Verification Center'}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              {manageMode ? 'Manage Your Profile' : 'Build Your Tutor Profile'}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {manageMode
                ? 'Update your public profile, availability, and teaching details. Credential changes may require re-verification.'
                : 'Complete this multi-step profile so super-admin can verify your credentials and publish your tutor profile.'}
            </p>
          </div>
          <div className="min-w-52 rounded-2xl border border-cyan-200 bg-cyan-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Form Completeness</p>
            <p className="font-heading text-3xl font-bold text-cyan-900">{completeness}%</p>
            <div className="mt-2 h-2 rounded-full bg-cyan-100">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${completeness}%` }} />
            </div>
          </div>
        </div>
      </AnimatedSection>

      {statusCard && (
        <AnimatedSection className="glass-panel rounded-3xl border border-indigo-200 bg-indigo-50/60 p-6" delay={0.06}>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Verification Status</p>
              <div className="mt-1 flex items-center gap-3">
                <p className="font-heading text-3xl font-bold text-slate-900">{statusCard.verificationStatus}</p>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                  statusCard.verificationStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                  statusCard.verificationStatus === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {statusCard.verificationStatus === 'Pending' ? 'Under Review' : statusCard.verificationStatus}
                </span>
              </div>
              {statusCard.verificationNotes && (
                <p className="mt-3 rounded-2xl bg-white/80 p-3 text-sm text-slate-700 border border-indigo-100">
                  <span className="font-bold text-indigo-600">Note:</span> {statusCard.verificationNotes}
                </p>
              )}
            </div>
            
            <div className="flex flex-col gap-3 sm:items-end">
              <div className="text-sm">
                <span className="text-slate-500">Profile Completeness:</span>
                <span className="ml-2 font-bold text-slate-900">{statusCard.profileCompleteness}%</span>
              </div>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`rounded-2xl px-6 py-3 font-bold transition shadow-sm ${
                  isEditMode 
                    ? 'bg-slate-900 text-white hover:bg-slate-800' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isEditMode ? '✕ Cancel Update' : '✏️ Update Profile Information'}
              </button>
            </div>
          </div>
          
          {!isEditMode && statusCard.verificationStatus === 'Pending' && (
            <p className="mt-6 text-sm text-center text-slate-500 italic">
              Your profile is currently under review. You can still update your details if needed.
            </p>
          )}
        </AnimatedSection>
      )}

      {statusCard?.verificationStatus === 'Rejected' && statusCard.verificationNotes && !isEditMode && (
        <RejectedBanner reason={statusCard.verificationNotes} />
      )}

      {(!statusCard || isEditMode) && (
        <React.Fragment>
          <AnimatedSection className="glass-panel rounded-3xl p-4" delay={0.08}>
            <div className="grid gap-2 sm:grid-cols-4">
              {steps.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (step > item.id) setStep(item.id);
                    else if (item.id === step + 1) handleNextStep();
                  }}
                  className={`rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition flex items-center justify-between ${
                    step === item.id
                      ? 'border-indigo-500/50 bg-indigo-500/15 text-[var(--mh-text)] ring-1 ring-indigo-500/25'
                      : 'border-[var(--mh-border)] bg-[var(--mh-input-bg)] text-[var(--mh-text-muted)] hover:border-indigo-400/40'
                  }`}
                >
                  <span>Step {item.id}: {item.title}</span>
                  {step > item.id && <span className="text-emerald-500 text-lg leading-none">✓</span>}
                </button>
              ))}
            </div>
          </AnimatedSection>

          {loading && (
            <AnimatedSection className="glass-panel rounded-3xl p-4" delay={0.1}>
              <p className="text-sm font-semibold text-slate-600">Loading your current profile status...</p>
            </AnimatedSection>
          )}
        </React.Fragment>
      )}

      {(!statusCard || isEditMode) ? (
        <form ref={formRef} onSubmit={submit} className="space-y-5">
        {step === 1 && (
          <section className="glass-panel rounded-3xl p-6">
            <h2 className="font-heading text-2xl font-bold text-slate-900">Identity & Education</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Full name
                <span className="ml-1 font-normal normal-case text-slate-400">(editable)</span>
                <input className="input-glow mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2" placeholder="Your display name" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} required />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
                <span className="ml-1 font-normal normal-case text-slate-400">{sessionEmail ? '(locked to your signup account)' : ''}</span>
                <input
                  className={`input-glow mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 ${sessionEmail ? 'cursor-not-allowed bg-slate-100/80 text-slate-600' : 'bg-white/80'}`}
                  type="email"
                  placeholder="Email"
                  value={sessionEmail || form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  readOnly={Boolean(sessionEmail)}
                  required
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Phone number
                <input className="input-glow mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2" placeholder="Phone number" value={form.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} required />
              </label>
              <label className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Profile Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload('profilePhotoUrl', e.target.files?.[0])}
                  className="w-full text-sm text-slate-600"
                />
              </label>
              <select className="input-glow rounded-xl border border-slate-200 bg-white/80 px-3 py-2" value={form.highestDegree} onChange={(e) => setField('highestDegree', e.target.value)} required>
                <option value="">Select Highest Degree</option>
                {HIGHEST_DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <input className="input-glow rounded-xl border border-slate-200 bg-white/80 px-3 py-2" placeholder="Field Of Study" value={form.fieldOfStudy} onChange={(e) => setField('fieldOfStudy', e.target.value)} required />
              <input className="input-glow rounded-xl border border-slate-200 bg-white/80 px-3 py-2" placeholder="Institution Name" value={form.institutionName} onChange={(e) => setField('institutionName', e.target.value)} required />
              <input className="input-glow rounded-xl border border-slate-200 bg-white/80 px-3 py-2" type="number" placeholder="Graduation Year" value={form.graduationYear} onChange={(e) => setField('graduationYear', e.target.value)} required />
            </div>
            {form.profilePhotoUrl && (
              <div className="mt-4 w-28 overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-1">
                <img 
                  src={form.profilePhotoUrl.startsWith('data:') ? form.profilePhotoUrl : resolvePublicAssetUrl(form.profilePhotoUrl, 'profiles')} 
                  alt="Tutor profile" 
                  className="h-24 w-full rounded-lg object-cover" 
                />
              </div>
            )}
            <label className="mt-4 block rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Degree Certificate</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload('degreeCertificateUrl', e.target.files?.[0])}
                className="w-full text-sm text-slate-600"
              />
            </label>
          </section>
        )}

        {step === 2 && (
          <section className="glass-panel rounded-3xl p-6 sm:p-8">
            <h2 className="font-heading text-2xl font-bold text-[var(--mh-text)]">Teaching Details</h2>
            <p className="mt-1 text-sm text-[var(--mh-text-muted)]">Pick from the catalog or add custom subjects and languages.</p>
            <motion.div className="mt-6">
              <MultiSelectPills
                label="Subjects you teach"
                options={catalog.subject}
                selected={form.subjects}
                onChange={(v) => setField('subjects', v)}
                columns={3}
                required
                allowCustom
                addCustomLabel="+ Add another subject"
                customPlaceholder="e.g. Statistics, Sociology…"
              />
            </motion.div>
            <div className="mt-6">
              <MultiSelectPills label="Grade levels" options={catalog.grade_level} selected={form.gradeLevels} onChange={(v) => setField('gradeLevels', v)} columns={3} required />
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <label className="block">
                <span className="mh-field-label">Years of experience</span>
                <input className="mh-field" type="number" min={0} placeholder="e.g. 5" value={form.yearsOfExperience} onChange={(e) => setField('yearsOfExperience', e.target.value)} required />
              </label>
              <motion.div>
                <MultiSelectPills
                  label="Languages"
                  options={catalog.language}
                  selected={form.languages}
                  onChange={(v) => setField('languages', v)}
                  columns={2}
                  required
                  allowCustom
                  customOptionLabel="Other"
                  customPlaceholder="e.g. French, German…"
                />
              </motion.div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mh-field-label">Teaching mode</span>
                <select className="mh-field" value={form.teachingMode} onChange={(e) => setField('teachingMode', e.target.value)}>
                  <option value="Online">Online</option>
                  <option value="InPerson">In Person</option>
                  <option value="Both">Both</option>
                </select>
              </label>
              {form.teachingMode !== 'Online' ? (
                <label className="block">
                  <span className="mh-field-label">In-person location</span>
                  <input className="mh-field" placeholder="City or area" value={form.inPersonLocation} onChange={(e) => setField('inPersonLocation', e.target.value)} required />
                </label>
              ) : null}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mh-field-label">Hourly fee (PKR)</span>
                <input className="mh-field" type="number" step="0.01" placeholder="e.g. 2000" value={form.hourlyFee} onChange={(e) => setField('hourlyFee', e.target.value)} required />
              </label>
              <label className="block">
                <span className="mh-field-label">Monthly fee (optional)</span>
                <input className="mh-field" type="number" step="0.01" placeholder="e.g. 15000" value={form.monthlyFee} onChange={(e) => setField('monthlyFee', e.target.value)} />
              </label>
            </div>
            <div className="mt-5">
              <MultiSelectPills label="Available Days" options={catalog.day_of_week} selected={form.availableDays} onChange={(v) => setField('availableDays', v)} columns={4} required />
            </div>
            <div className="mt-5">
              <CustomTimeSlotEditor
                label="Available Time Slots"
                catalogSlots={catalog.time_slot || []}
                selected={form.availableTimeSlots}
                onChange={(v) => setField('availableTimeSlots', v)}
                required
              />
            </div>
            <motion.div className="mh-alert-warning mt-6 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide">Leave / unavailable dates</p>
              <p className="text-sm font-normal opacity-90">Students cannot book on these days.</p>
              <input
                type="date"
                className="mh-field max-w-xs"
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v || form.unavailableDates.includes(v)) return;
                  setField('unavailableDates', [...form.unavailableDates, v]);
                  e.target.value = '';
                }}
              />
              {form.unavailableDates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {form.unavailableDates.map((d) => (
                    <span key={d} className="mh-badge-amber inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold">
                      {d}
                      <button type="button" onClick={() => setField('unavailableDates', form.unavailableDates.filter((x) => x !== d))} aria-label="Remove date">×</button>
                    </span>
                  ))}
                </div>
              ) : null}
            </motion.div>
            <label className="mt-6 block">
              <span className="mh-field-label">Bio</span>
              <textarea className="mh-field min-h-[7rem] resize-y" placeholder="Tell students about yourself" value={form.bio} onChange={(e) => setField('bio', e.target.value)} required />
            </label>
            <label className="mt-6 block">
              <span className="mh-field-label">Teaching methodology</span>
              <select className="mh-field" value={form.teachingMethodology} onChange={(e) => setField('teachingMethodology', e.target.value)} required>
                <option value="">Select methodology</option>
                {TEACHING_METHODOLOGIES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="mt-6 block">
              <span className="mh-field-label">Achievements (optional)</span>
              <textarea className="mh-field min-h-[5rem] resize-y" placeholder="Awards, certifications, results…" value={form.achievements} onChange={(e) => setField('achievements', e.target.value)} />
            </label>
          </section>
        )}

        {step === 3 && (
          <section className="glass-panel rounded-3xl p-6">
            <h2 className="font-heading text-2xl font-bold text-slate-900">Verification Documents</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <select className="input-glow rounded-xl border border-slate-200 bg-white/80 px-3 py-2" value={form.governmentIdType} onChange={(e) => setField('governmentIdType', e.target.value)}>
                <option value="Cnic">CNIC</option>
                <option value="Passport">Passport</option>
                <option value="DrivingLicense">Driving License</option>
                <option value="Other">Other</option>
              </select>
              <label className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Government ID Document</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileUpload('governmentIdDocumentUrl', e.target.files?.[0])}
                  className="w-full text-sm text-slate-600"
                />
              </label>
            </div>
            <label className="mt-4 block rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-600">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Teaching Licenses / Certificates (optional)</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload('teachingLicensesOrCertificatesUrl', e.target.files?.[0])}
                className="w-full text-sm text-slate-600"
              />
            </label>
            <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.backgroundCheckConsent} onChange={(e) => setField('backgroundCheckConsent', e.target.checked)} />
              I consent to background verification check.
            </label>
          </section>
        )}

        {step === 4 && (
          <section className="glass-panel rounded-3xl p-6">
            <h2 className="font-heading text-2xl font-bold text-slate-900">Policies & Submission</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <input type="checkbox" checked={form.termsAccepted} onChange={(e) => setField('termsAccepted', e.target.checked)} />
                I accept the Terms and Conditions.
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <input type="checkbox" checked={form.privacyAccepted} onChange={(e) => setField('privacyAccepted', e.target.checked)} />
                I accept the Privacy Policy.
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <input type="checkbox" checked={form.commissionPolicyAccepted} onChange={(e) => setField('commissionPolicyAccepted', e.target.checked)} />
                I accept the commission policy.
              </label>
            </div>
            <MotionButton
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={saving}
              className="glow-button mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-70"
            >
              {saving ? 'Submitting...' : 'Submit For Verification'}
            </MotionButton>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1}
            className="rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Previous Step
          </button>
          {step !== 4 && (
            <button
              type="button"
              onClick={handleNextStep}
              className="rounded-xl border border-cyan-300 bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-800 disabled:opacity-50"
            >
              Next Step
            </button>
          )}
        </div>
      </form>
      ) : null}
    </div>
  );
}

export default TutorOnboarding;

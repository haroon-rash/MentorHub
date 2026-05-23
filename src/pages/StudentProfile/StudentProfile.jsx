import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AnimatedSection from '../../components/ui/AnimatedSection.jsx';
import MultiSelectPills from '../../components/ui/MultiSelectPills.jsx';
import FileUpload from '../../components/ui/FileUpload.jsx';
import TagSelect from '../../components/ui/TagSelect.jsx';
import {
  fetchStudentOnboardingProfile,
  upsertStudentOnboardingProfile,
  uploadProfilePicture,
  extractUploadUrl,
} from '../../services/authApi.js';
import {
  DAYS_OF_WEEK,
  TIME_SLOTS,
  SUBJECTS,
  INTERESTS,
  LANGUAGES,
} from '../../data/onboardingConstants.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { resolvePublicAssetUrl } from '../../utils/urls.js';
import WarningBanner from '../../components/tutor/WarningBanner.jsx';
import {
  calculateStudentCompleteness,
  getFirstIncompleteStudentStep,
  getMissingStudentFields,
  getMissingStudentFieldsForStep,
  MIN_BOOKING_COMPLETENESS,
  canBookWithProfile,
  resolveEducationLevel,
  resolveMediumOfEducation,
} from '../../utils/studentProfile.js';

const MotionButton = motion.button;
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const EDUCATION_LEVEL_OPTIONS = ['Primary', 'Secondary', 'O-Level', 'A-Level', 'University', 'Other'];
const MEDIUM_OPTIONS = ['English', 'Urdu', 'Other'];

const inputClass = 'mh-field w-full';

function FormField({ label, required, children, hint }) {
  return (
    <label className="block space-y-2">
      <span className="mh-field-label">
        {label}
        {required ? <span className="ml-0.5 text-rose-400">*</span> : null}
        {!required && hint?.toLowerCase().includes('optional') ? (
          <span className="ml-2 normal-case font-medium text-[var(--mh-text-muted)]">(optional)</span>
        ) : null}
      </span>
      {children}
      {hint && !hint.toLowerCase().includes('optional') ? (
        <p className="text-xs text-[var(--mh-text-muted)]">{hint}</p>
      ) : null}
    </label>
  );
}

const steps = [
  { id: 1, title: 'Credentials & Personal' },
  { id: 2, title: 'Academic & Needs' },
  { id: 3, title: 'Session Preferences' },
  { id: 4, title: 'Guardian & Policies' },
];

const initialForm = {
  fullName: '',
  email: '',
  phoneNumber: '',
  profilePhotoUrl: '',
  dateOfBirth: '',
  gender: '',
  cityOrArea: '',
  educationLevel: '',
  educationLevelOther: '',
  currentGradeOrYear: '',
  schoolOrInstitutionName: '',
  mediumOfEducation: 'English',
  mediumOfEducationOther: '',
  subjects: [],
  interests: [],
  topicsOfDifficulty: '',
  tutoringPurpose: '',
  learningGoalsOrTargetGrade: '',
  preferredMode: 'Online',
  preferredDays: [],
  preferredTimeSlots: [],
  budgetPerSession: '',
  budgetPerMonth: '',
  preferredTutorGender: '',
  preferredLanguageOfInstruction: 'English',
  guardianFullName: '',
  guardianContactNumber: '',
  guardianEmailAddress: '',
  guardianRelationship: '',
  guardianConsentAcknowledgment: false,
  termsAccepted: false,
  privacyAccepted: false,
};

function toList(value) {
  if (Array.isArray(value)) return value;
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// toDataUrl removed since we now upload documents properly
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

function StudentProfile() {
  const formRef = React.useRef(null);
  const { token, name, email } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedProfile, setSavedProfile] = useState(null);
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('studentOnboardingDraft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    const isStudent = token && !name?.toLowerCase().includes('admin');
    return {
      ...initialForm,
      fullName: isStudent ? (name || '') : '',
      email: isStudent ? (email || '') : '',
    };
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const age = useMemo(() => calculateAge(form.dateOfBirth), [form.dateOfBirth]);
  const isMinor = age !== null && age < 18;

  const completeness = useMemo(
    () => calculateStudentCompleteness(form, isMinor),
    [form, isMinor],
  );

  const missingFields = useMemo(
    () => getMissingStudentFields(form, isMinor),
    [form, isMinor],
  );

  const bookingReady = canBookWithProfile(savedProfile?.profileCompleteness ?? completeness);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await fetchStudentOnboardingProfile(token);
        if (!active || !profile) {
          return;
        }

        setSavedProfile(profile);
        setForm((prev) => ({
          ...prev,
          fullName: profile.fullName || prev.fullName,
          email: profile.email || prev.email,
          phoneNumber: profile.phoneNumber || '',
          profilePhotoUrl: profile.profilePhotoUrl || '',
          dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : '',
          gender: profile.gender || '',
          cityOrArea: profile.cityOrArea || '',
          educationLevel: EDUCATION_LEVEL_OPTIONS.includes(profile.educationLevel)
            ? profile.educationLevel
            : profile.educationLevel
              ? 'Other'
              : '',
          educationLevelOther: EDUCATION_LEVEL_OPTIONS.includes(profile.educationLevel)
            ? ''
            : profile.educationLevel || '',
          currentGradeOrYear: profile.currentGradeOrYear || '',
          schoolOrInstitutionName: profile.schoolOrInstitutionName || '',
          mediumOfEducation: MEDIUM_OPTIONS.includes(profile.mediumOfEducation)
            ? profile.mediumOfEducation
            : profile.mediumOfEducation
              ? 'Other'
              : 'English',
          mediumOfEducationOther: MEDIUM_OPTIONS.includes(profile.mediumOfEducation)
            ? ''
            : profile.mediumOfEducation || '',
          subjects: Array.isArray(profile.subjects) ? profile.subjects : [],
          interests: Array.isArray(profile.interests) ? profile.interests : [],
          topicsOfDifficulty: profile.topicsOfDifficulty || '',
          tutoringPurpose: profile.tutoringPurpose || '',
          learningGoalsOrTargetGrade: profile.learningGoalsOrTargetGrade || '',
          preferredMode: profile.preferredMode || 'Online',
          preferredDays: Array.isArray(profile.preferredDays) ? profile.preferredDays : [],
          preferredTimeSlots: Array.isArray(profile.preferredTimeSlots) ? profile.preferredTimeSlots : [],
          budgetPerSession: profile.budgetPerSession ?? '',
          budgetPerMonth: profile.budgetPerMonth ?? '',
          preferredTutorGender: profile.preferredTutorGender || '',
          preferredLanguageOfInstruction: profile.preferredLanguageOfInstruction || 'English',
          guardianFullName: profile.guardianFullName || '',
          guardianContactNumber: profile.guardianContactNumber || '',
          guardianEmailAddress: profile.guardianEmailAddress || '',
          guardianRelationship: profile.guardianRelationship || '',
          guardianConsentAcknowledgment: Boolean(profile.guardianConsentAcknowledgment),
          termsAccepted: Boolean(profile.termsAccepted),
          privacyAccepted: Boolean(profile.privacyAccepted),
        }));
      } catch {
        // A missing profile is expected for first-time students.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    localStorage.setItem('studentOnboardingDraft', JSON.stringify(form));
  }, [form]);

  const setField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleProfilePhotoUpload = async (file) => {
    const url = extractUploadUrl(await uploadProfilePicture(file, token));
    if (url) {
      setField('profilePhotoUrl', url);
      toast.success('Profile photo uploaded');
    }
    return url;
  };

  const handleNextStep = () => {
    const stepMissing = getMissingStudentFieldsForStep(form, step, isMinor);
    if (stepMissing.length > 0) {
      toast.error(`Please complete: ${stepMissing.join(', ')}`);
      return;
    }
    if (formRef.current && !formRef.current.reportValidity()) {
      return;
    }
    setStep((prev) => Math.min(4, prev + 1));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!token) {
      toast.error('You need to sign in first');
      return;
    }

    if (!form.termsAccepted || !form.privacyAccepted) {
      toast.error('Please accept Terms and Privacy Policy before submitting');
      return;
    }

    if (isMinor && !form.guardianConsentAcknowledgment) {
      toast.error('Guardian consent is required for students under 18');
      return;
    }

    const resolvedEducation =
      form.educationLevel === 'Other' ? form.educationLevelOther.trim() : form.educationLevel;
    if (!resolvedEducation) {
      toast.error(form.educationLevel === 'Other' ? 'Please enter your education level' : 'Education level is required');
      return;
    }

    const resolvedMedium =
      form.mediumOfEducation === 'Other' ? form.mediumOfEducationOther.trim() : form.mediumOfEducation;
    if (!resolvedMedium) {
      toast.error('Please specify your medium of education');
      return;
    }

    if (!form.dateOfBirth) {
      toast.error('Date of birth is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber,
        profilePhotoUrl: form.profilePhotoUrl || null,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender || null,
        cityOrArea: form.cityOrArea,
        educationLevel: resolvedEducation,
        currentGradeOrYear: form.currentGradeOrYear,
        schoolOrInstitutionName: form.schoolOrInstitutionName || null,
        mediumOfEducation: resolvedMedium,
        subjects: toList(form.subjects),
        interests: toList(form.interests),
        topicsOfDifficulty: form.topicsOfDifficulty || null,
        tutoringPurpose: form.tutoringPurpose,
        learningGoalsOrTargetGrade: form.learningGoalsOrTargetGrade || null,
        preferredMode: form.preferredMode,
        preferredDays: toList(form.preferredDays),
        preferredTimeSlots: toList(form.preferredTimeSlots),
        budgetPerSession: form.budgetPerSession === '' || Number.isNaN(Number(form.budgetPerSession)) ? null : Number(form.budgetPerSession),
        budgetPerMonth: form.budgetPerMonth === '' || Number.isNaN(Number(form.budgetPerMonth)) ? null : Number(form.budgetPerMonth),
        preferredTutorGender: form.preferredTutorGender || null,
        preferredLanguageOfInstruction: form.preferredLanguageOfInstruction,
        guardianFullName: form.guardianFullName || null,
        guardianContactNumber: form.guardianContactNumber || null,
        guardianEmailAddress: form.guardianEmailAddress || null,
        guardianRelationship: form.guardianRelationship || null,
        guardianConsentAcknowledgment: form.guardianConsentAcknowledgment,
        termsAccepted: form.termsAccepted,
        privacyAccepted: form.privacyAccepted,
      };

      const response = await upsertStudentOnboardingProfile({ token, payload });
      setSavedProfile(response);
      toast.success('Student profile saved successfully');
      setIsEditMode(false);
    } catch (error) {
      toast.error(error.message || 'Failed to save student profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <WarningBanner />
      <AnimatedSection className="glass-panel rounded-3xl p-6 sm:p-8" delay={0.05}>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Student Registration</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">Student Learning Profile</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Complete your student profile so we can match you with the right tutor, schedule, and learning plan.
            </p>
          </div>
          <div className="min-w-56 rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Profile Completeness</p>
            <p className="font-heading text-3xl font-bold text-[var(--mh-text)]">{completeness}%</p>
            <div className="mt-2 h-2 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
              <div
                className={`h-full rounded-full ${bookingReady ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gradient-to-r from-indigo-500 to-cyan-500'}`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] font-medium text-[var(--mh-text-muted)]">
              {bookingReady
                ? `Ready to book (${MIN_BOOKING_COMPLETENESS}%+ required)`
                : `${Math.max(0, MIN_BOOKING_COMPLETENESS - completeness)}% more to enable booking`}
            </p>
            {missingFields.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-[11px] text-[var(--mh-text-muted)]">
                {missingFields.slice(0, 4).map((field) => (
                  <li key={field}>• {field}</li>
                ))}
                {missingFields.length > 4 ? (
                  <li className="text-indigo-600 dark:text-indigo-300">+{missingFields.length - 4} more</li>
                ) : null}
              </ul>
            )}
          </div>
        </div>
      </AnimatedSection>

      {savedProfile && (
        <AnimatedSection className="glass-panel rounded-3xl border border-cyan-200 bg-cyan-50/70 p-6" delay={0.07}>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Profile Status</p>
              <h3 className="font-heading text-2xl font-bold text-slate-900">Learning Profile Active</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Your learning preferences are saved and being used for tutor matching.
                Completeness:{' '}
                <span className="font-bold text-cyan-700 dark:text-cyan-300">{savedProfile.profileCompleteness}%</span>
                {canBookWithProfile(savedProfile.profileCompleteness) ? (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Booking enabled
                  </span>
                ) : (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    {MIN_BOOKING_COMPLETENESS}% required to book
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`rounded-2xl px-6 py-3 font-bold transition shadow-sm ${
                isEditMode 
                  ? 'bg-slate-900 text-white hover:bg-slate-800' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isEditMode ? '✕ Cancel Edit' : '✏️ Update Learning Profile'}
            </button>
          </div>
        </AnimatedSection>
      )}

      {loading && !savedProfile && (
        <AnimatedSection className="glass-panel rounded-3xl p-4" delay={0.08}>
          <p className="text-sm font-semibold text-slate-600">Loading your student profile...</p>
        </AnimatedSection>
      )}

      {(!savedProfile || isEditMode) && (
        <AnimatedSection className="glass-panel rounded-3xl p-4" delay={0.1}>
          <div className="grid gap-2 sm:grid-cols-4">
            {steps.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id < step) {
                    setStep(item.id);
                    return;
                  }
                  if (item.id === step + 1) {
                    handleNextStep();
                  }
                }}
                className={`rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition flex items-center justify-between ${
                  step === item.id
                    ? 'border-indigo-300 bg-indigo-100 text-indigo-800'
                    : 'border-slate-200 bg-white/70 text-slate-600 hover:border-indigo-200'
                }`}
              >
                <span>Step {item.id}: {item.title}</span>
                {step > item.id && <span className="text-emerald-500 text-lg leading-none">✓</span>}
              </button>
            ))}
          </div>
        </AnimatedSection>
      )}

      {(!savedProfile || isEditMode) ? (
        <form ref={formRef} onSubmit={submit} className="space-y-5">
        {step === 1 ? (
          <section className="glass-panel rounded-3xl p-6 sm:p-8">
            <h2 className="font-heading text-2xl font-bold text-slate-900">Account & Personal Information</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <FormField label="Full name" required hint="Pre-filled from signup — you can change how your name appears on your profile">
                <input className={inputClass} value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} required />
              </FormField>
              <FormField label="Email address" required hint={email ? 'Locked to your signup email (cannot be changed)' : undefined}>
                <input
                  className={`${inputClass} ${email ? 'cursor-not-allowed bg-slate-100/80 text-slate-600' : ''}`}
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  readOnly={Boolean(email)}
                  required
                />
              </FormField>
              <FormField label="Phone Number" required>
                <input className={inputClass} value={form.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} required />
              </FormField>
              <FormField label="Date of Birth" required>
                <input className={inputClass} type="date" value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} required />
              </FormField>
              <FormField label="Gender" hint="Optional">
                <select className={inputClass} value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
                  <option value="">Select gender (optional)</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="PreferNotToSay">Prefer not to say</option>
                  <option value="Other">Other</option>
                </select>
              </FormField>
              <FormField label="City / Area" required>
                <input className={inputClass} value={form.cityOrArea} onChange={(e) => setField('cityOrArea', e.target.value)} required />
              </FormField>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
              <FormField label="Profile Photo" required hint="JPG or PNG, max 5MB">
                <FileUpload
                  accept="image/*"
                  maxBytes={MAX_UPLOAD_SIZE_BYTES}
                  currentUrl={form.profilePhotoUrl || null}
                  onUpload={handleProfilePhotoUpload}
                  onClear={() => setField('profilePhotoUrl', '')}
                  helperText="Drag & drop or click to upload"
                />
              </FormField>
              {form.profilePhotoUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
                  <div className="h-28 w-28 overflow-hidden rounded-2xl border-2 border-indigo-200 bg-white/80 shadow-md dark:border-indigo-700">
                    <img
                      src={form.profilePhotoUrl.startsWith('data:') ? form.profilePhotoUrl : resolvePublicAssetUrl(form.profilePhotoUrl, 'profiles')}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="glass-panel rounded-3xl p-6 sm:p-8">
            <h2 className="font-heading text-2xl font-bold text-slate-900">Academic Information & Learning Needs</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <FormField label="Education Level" required>
                <select
                  className={inputClass}
                  value={form.educationLevel}
                  onChange={(e) => {
                    setField('educationLevel', e.target.value);
                    if (e.target.value !== 'Other') setField('educationLevelOther', '');
                  }}
                  required
                >
                  <option value="">Select current education level</option>
                  {EDUCATION_LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                {form.educationLevel === 'Other' && (
                  <input
                    className={`${inputClass} mt-2`}
                    value={form.educationLevelOther}
                    onChange={(e) => setField('educationLevelOther', e.target.value)}
                    placeholder="Enter your education level (e.g. BS Computer Science)"
                    required
                  />
                )}
              </FormField>
              <FormField label="Current Grade / Year" required>
                <input className={inputClass} value={form.currentGradeOrYear} onChange={(e) => setField('currentGradeOrYear', e.target.value)} required />
              </FormField>
              <FormField label="School / Institution" hint="Optional">
                <input className={inputClass} value={form.schoolOrInstitutionName} onChange={(e) => setField('schoolOrInstitutionName', e.target.value)} />
              </FormField>
              <FormField label="Medium of Education" required>
                <select
                  className={inputClass}
                  value={form.mediumOfEducation}
                  onChange={(e) => {
                    setField('mediumOfEducation', e.target.value);
                    if (e.target.value !== 'Other') setField('mediumOfEducationOther', '');
                  }}
                  required
                >
                  {MEDIUM_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {form.mediumOfEducation === 'Other' && (
                  <input
                    className={`${inputClass} mt-2`}
                    value={form.mediumOfEducationOther}
                    onChange={(e) => setField('mediumOfEducationOther', e.target.value)}
                    placeholder="Specify medium of education"
                    required
                  />
                )}
              </FormField>
            </div>
            <div className="mt-8 space-y-6">
              <TagSelect
                label="Subjects You Need Help With"
                options={SUBJECTS}
                value={form.subjects}
                onChange={(v) => setField('subjects', v)}
                allowCustom
                required
                placeholder="Search subjects or type a custom subject and press Enter"
              />
              <TagSelect
                label="Learning Interests"
                options={INTERESTS}
                value={form.interests}
                onChange={(v) => setField('interests', v)}
                allowCustom
                required
                hint="e.g. Java, IELTS, Spring Boot — powers your personalized tutor feed"
                placeholder="Search interests or type custom (Enter to add)"
              />
            </div>
            <FormField label="Topics or Areas of Difficulty" hint="Optional">
              <textarea className={`${inputClass} min-h-20`} value={form.topicsOfDifficulty} onChange={(e) => setField('topicsOfDifficulty', e.target.value)} />
            </FormField>
            <FormField label="Purpose of Tutoring" required>
              <textarea className={`${inputClass} min-h-20`} value={form.tutoringPurpose} onChange={(e) => setField('tutoringPurpose', e.target.value)} required placeholder="Exam prep, concept clarity, homework help, skill building, etc." />
            </FormField>
            <FormField label="Learning Goals or Target Grade" hint="Optional">
              <textarea className={`${inputClass} min-h-20`} value={form.learningGoalsOrTargetGrade} onChange={(e) => setField('learningGoalsOrTargetGrade', e.target.value)} />
            </FormField>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="glass-panel rounded-3xl p-6">
            <h2 className="font-heading text-2xl font-bold text-slate-900">Session Preferences</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <FormField label="Preferred Session Mode" required>
                <select className={inputClass} value={form.preferredMode} onChange={(e) => setField('preferredMode', e.target.value)} required>
                  <option value="Online">Online</option>
                  <option value="InPerson">In-Person</option>
                  <option value="Both">Both</option>
                </select>
              </FormField>
              <FormField label="Language of Instruction" required>
                <select className={inputClass} value={form.preferredLanguageOfInstruction} onChange={(e) => setField('preferredLanguageOfInstruction', e.target.value)} required>
                  <option value="">Select language</option>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </FormField>
            </div>

            <div className="mt-5">
              <MultiSelectPills label="Preferred Days" options={DAYS_OF_WEEK} selected={form.preferredDays} onChange={(v) => setField('preferredDays', v)} columns={4} required />
            </div>

            <div className="mt-5">
              <MultiSelectPills label="Preferred Time Slots" options={TIME_SLOTS} selected={form.preferredTimeSlots} onChange={(v) => setField('preferredTimeSlots', v)} columns={3} required />
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <FormField label="Budget per Session (PKR)" hint="Optional">
                <input className={inputClass} type="number" min="0" step="1" value={form.budgetPerSession} onChange={(e) => setField('budgetPerSession', e.target.value)} />
              </FormField>
              <FormField label="Budget per Month (PKR)" hint="Optional">
                <input className={inputClass} type="number" min="0" step="1" value={form.budgetPerMonth} onChange={(e) => setField('budgetPerMonth', e.target.value)} />
              </FormField>
              <FormField label="Preferred Tutor Gender" hint="Optional">
                <select className={inputClass} value={form.preferredTutorGender} onChange={(e) => setField('preferredTutorGender', e.target.value)}>
                  <option value="">No preference</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="NoPreference">No preference</option>
                </select>
              </FormField>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="glass-panel rounded-3xl p-6">
            <h2 className="font-heading text-2xl font-bold text-slate-900">Guardian Information & Agreements</h2>
            {isMinor ? (
              <div className="mt-4 space-y-4">
                <p className="mh-alert-warning">
                  Student is under 18. Guardian details are required.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Guardian Full Name" required>
                    <input className={inputClass} value={form.guardianFullName} onChange={(e) => setField('guardianFullName', e.target.value)} required={isMinor} />
                  </FormField>
                  <FormField label="Guardian Contact Number" required>
                    <input className={inputClass} value={form.guardianContactNumber} onChange={(e) => setField('guardianContactNumber', e.target.value)} required={isMinor} />
                  </FormField>
                  <FormField label="Guardian Email Address" hint="Optional">
                    <input className={inputClass} type="email" value={form.guardianEmailAddress} onChange={(e) => setField('guardianEmailAddress', e.target.value)} />
                  </FormField>
                  <FormField label="Relationship to Student" required>
                    <input className={inputClass} value={form.guardianRelationship} onChange={(e) => setField('guardianRelationship', e.target.value)} required={isMinor} />
                  </FormField>
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.guardianConsentAcknowledgment} onChange={(e) => setField('guardianConsentAcknowledgment', e.target.checked)} />
                  I acknowledge guardian consent for this minor student.
                </label>
              </div>
            ) : (
              <p className="mh-alert-success mt-4">
                Student is 18+; guardian details are optional.
              </p>
            )}

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <input type="checkbox" checked={form.termsAccepted} onChange={(e) => setField('termsAccepted', e.target.checked)} />
                I accept platform Terms and Conditions.
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
                <input type="checkbox" checked={form.privacyAccepted} onChange={(e) => setField('privacyAccepted', e.target.checked)} />
                I accept Privacy Policy.
              </label>
            </div>

            <MotionButton
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={saving}
              className="glow-button mt-5 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-3 font-semibold text-white disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save Student Profile'}
            </MotionButton>
          </section>
        ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
        <button
          type="button"
          onClick={() => setStep((prev) => Math.max(1, prev - 1))}
          disabled={step === 1}
          className="rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          Previous Step
        </button>
        {step < 4 && (
          <button
            type="button"
            onClick={handleNextStep}
            className="rounded-xl border border-indigo-300 bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-800 disabled:opacity-50"
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

export default StudentProfile;
/** Matches backend StudentProfileConstants.MinCompletenessForBooking */
export const MIN_BOOKING_COMPLETENESS = 90;

const COMPLETENESS_CHECKS = [
  { key: 'fullName', label: 'Full name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone number' },
  { key: 'profilePhotoUrl', label: 'Profile photo' },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'cityOrArea', label: 'City / area' },
  { key: 'educationLevel', label: 'Education level' },
  { key: 'currentGradeOrYear', label: 'Current grade / year' },
  { key: 'mediumOfEducation', label: 'Medium of education' },
  { key: 'subjects', label: 'Subjects', isList: true },
  { key: 'interests', label: 'Learning interests', isList: true },
  { key: 'tutoringPurpose', label: 'Tutoring purpose' },
  { key: 'preferredMode', label: 'Preferred session mode' },
  { key: 'preferredDays', label: 'Preferred days', isList: true },
  { key: 'preferredTimeSlots', label: 'Preferred time slots', isList: true },
  { key: 'preferredLanguageOfInstruction', label: 'Language of instruction' },
  { key: 'termsAccepted', label: 'Terms & conditions', isBool: true },
  { key: 'privacyAccepted', label: 'Privacy policy', isBool: true },
];

const MINOR_CHECKS = [
  { key: 'guardianFullName', label: 'Guardian full name' },
  { key: 'guardianContactNumber', label: 'Guardian contact number' },
  { key: 'guardianRelationship', label: 'Guardian relationship' },
  { key: 'guardianConsentAcknowledgment', label: 'Guardian consent', isBool: true },
];

/** Wizard step (1–4) for each completeness check */
const CHECK_STEP = {
  fullName: 1,
  email: 1,
  phoneNumber: 1,
  profilePhotoUrl: 1,
  dateOfBirth: 1,
  cityOrArea: 1,
  educationLevel: 2,
  currentGradeOrYear: 2,
  mediumOfEducation: 2,
  subjects: 2,
  interests: 2,
  tutoringPurpose: 2,
  preferredMode: 3,
  preferredDays: 3,
  preferredTimeSlots: 3,
  preferredLanguageOfInstruction: 3,
  guardianFullName: 4,
  guardianContactNumber: 4,
  guardianRelationship: 4,
  guardianConsentAcknowledgment: 4,
  termsAccepted: 4,
  privacyAccepted: 4,
};

export function resolveEducationLevel(form) {
  if (form.educationLevel === 'Other') {
    return (form.educationLevelOther || '').trim();
  }
  return (form.educationLevel || '').trim();
}

export function resolveMediumOfEducation(form) {
  if (form.mediumOfEducation === 'Other') {
    return (form.mediumOfEducationOther || '').trim();
  }
  return (form.mediumOfEducation || '').trim();
}

function isCheckComplete(form, check) {
  if (check.key === 'educationLevel') {
    return Boolean(resolveEducationLevel(form));
  }
  if (check.key === 'mediumOfEducation') {
    return Boolean(resolveMediumOfEducation(form));
  }

  const value = form[check.key];
  if (check.isBool) return Boolean(value);
  if (check.isList) return Array.isArray(value) && value.length > 0;
  return Boolean(value && String(value).trim());
}

export function getStudentCompletenessChecks(form, isMinor) {
  return isMinor ? [...COMPLETENESS_CHECKS, ...MINOR_CHECKS] : COMPLETENESS_CHECKS;
}

export function calculateStudentCompleteness(form, isMinor) {
  const checks = getStudentCompletenessChecks(form, isMinor);
  const done = checks.filter((check) => isCheckComplete(form, check)).length;
  return Math.round((done / checks.length) * 100);
}

export function getMissingStudentFields(form, isMinor) {
  return getStudentCompletenessChecks(form, isMinor)
    .filter((check) => !isCheckComplete(form, check))
    .map((check) => check.label);
}

/** Missing field labels for a single wizard step (used before Next / on save). */
export function getMissingStudentFieldsForStep(form, step, isMinor) {
  return getStudentCompletenessChecks(form, isMinor)
    .filter((check) => CHECK_STEP[check.key] === step && !isCheckComplete(form, check))
    .map((check) => check.label);
}

/** First wizard step that still has missing required fields. */
export function getFirstIncompleteStudentStep(form, isMinor) {
  for (let s = 1; s <= 4; s += 1) {
    if (getMissingStudentFieldsForStep(form, s, isMinor).length > 0) {
      return s;
    }
  }
  return null;
}

export function canBookWithProfile(completeness) {
  return (completeness ?? 0) >= MIN_BOOKING_COMPLETENESS;
}

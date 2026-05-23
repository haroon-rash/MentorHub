export function toStringList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function normalizeTutorForScheduling(raw) {
  if (!raw) return null;

  return {
    ...raw,
    id: raw.id || raw.tutorProfileId,
    fullName: raw.fullName || raw.name,
    subjects: toStringList(raw.subjects ?? raw.subjectsCsv),
    availableDays: toStringList(raw.availableDays ?? raw.availableDaysCsv),
    availableTimeSlots: toStringList(raw.availableTimeSlots ?? raw.availableTimeSlotsCsv),
    unavailableDates: toStringList(raw.unavailableDates ?? raw.unavailableDatesCsv),
    hourlyFee: raw.hourlyFee ?? raw.fee ?? 0,
    isVerified: Boolean(raw.isVerified ?? raw.verificationStatus === 'Approved'),
    profilePhotoUrl: raw.profilePhotoUrl || raw.photoUrl,
  };
}

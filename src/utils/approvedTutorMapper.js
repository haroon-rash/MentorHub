export function mapApprovedTutorToCardModel(tutor) {
  const subjects = normalizeSubjects(tutor?.subjects);
  const primarySubject = subjects[0] || tutor?.highestDegree || 'Tutor';
  const experienceYears = Number(tutor?.yearsOfExperience || 0);
  const estimatedSessions = Math.max(0, experienceYears * 40);
  const name = tutor?.fullName || 'Tutor';

  return {
    id: tutor?.tutorProfileId || tutor?.id,
    authUserId: tutor?.authUserId || tutor?.AuthUserId || '',
    name,
    headline: [tutor?.highestDegree, tutor?.teachingMode].filter(Boolean).join(' | ') || 'Verified Tutor',
    subject: primarySubject,
    subjects,
    expertise: sanitizeBio(tutor?.bio) || tutor?.teachingMethodology || 'Experienced and verified tutor ready to help you reach your goals.',
    rating: Number(tutor?.averageRating ?? tutor?.AverageRating ?? 0),
    averageRating: Number(tutor?.averageRating ?? tutor?.AverageRating ?? 0),
    reviewCount: Number(tutor?.reviewCount ?? tutor?.ReviewCount ?? 0),
    fee: Number(tutor?.hourlyFee || 0),
    availability: 'Available Now',
    sessions: estimatedSessions,
    photoUrl: tutor?.profilePhotoUrl || '',
    initials: getInitials(name),
    raw: tutor,
  };
}

function sanitizeBio(bio) {
  const text = String(bio || '').trim();
  if (!text || text.length < 8) return '';
  if (/^[a-z]{2,8}$/i.test(text)) return '';
  return text;
}

function getInitials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'TU';
}

function normalizeSubjects(subjects) {
  if (!subjects) {
    return [];
  }

  if (Array.isArray(subjects)) {
    return subjects.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }

  return String(subjects)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

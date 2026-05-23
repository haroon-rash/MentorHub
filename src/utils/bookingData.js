/** Normalize booking payloads from API (camelCase or PascalCase). */
export function normalizeBooking(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const sessionMode = raw.sessionMode ?? raw.SessionMode ?? '';
  const isInPerson = String(sessionMode).toLowerCase().includes('person');
  return {
    ...raw,
    id: raw.id ?? raw.Id,
    tutorProfileId: raw.tutorProfileId ?? raw.TutorProfileId,
    tutorName: raw.tutorName ?? raw.TutorName ?? 'Tutor',
    bookingDate: raw.bookingDate ?? raw.BookingDate,
    timeSlot: raw.timeSlot ?? raw.TimeSlot ?? '',
    status: raw.status ?? raw.Status ?? 'Pending',
    sessionMode,
    isInPerson,
    subject: raw.subject ?? raw.Subject ?? '',
    fee: raw.fee ?? raw.Fee ?? 0,
    meetingLink: raw.meetingLink ?? raw.MeetingLink ?? null,
    locationOrMeetingInfo: raw.locationOrMeetingInfo ?? raw.LocationOrMeetingInfo ?? null,
    studentNotes: raw.studentNotes ?? raw.StudentNotes ?? '',
    createdAtUtc: raw.createdAtUtc ?? raw.CreatedAtUtc,
  };
}

const PENDING_LOCATION_PLACEHOLDER =
  'tutor will share the meeting address after they confirm';
const CONFIRMED_NO_ADDRESS =
  'contact your tutor in Messages for the meeting address';

/** Student-facing location / meeting line for a single-session booking card. */
export function bookingLocationDisplay(booking) {
  if (!booking) return null;
  const status = String(booking.status || '').toLowerCase();
  const info = (booking.locationOrMeetingInfo || '').trim();
  const isPending = status === 'pending';

  if (booking.isInPerson) {
    if (info && !info.toLowerCase().includes(PENDING_LOCATION_PLACEHOLDER)) return info;
    if (isPending) return 'In-person — your tutor will share the meeting address after they confirm this session.';
    return `In-person — ${CONFIRMED_NO_ADDRESS}.`;
  }
  if (booking.meetingLink) return booking.meetingLink;
  if (info && !info.toLowerCase().includes('when your tutor confirms')) return info;
  if (isPending) return 'Online — meeting link shared when your tutor confirms the session.';
  return 'Online — message your tutor for the join link if you do not see one above.';
}

export function unwrapBookings(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.Data)) return payload.Data;
  }
  return [];
}

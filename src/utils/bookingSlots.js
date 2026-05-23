/**
 * Client-side mirror of BookingTimeSlotHelper (.NET) for overlap detection.
 */

function normalizeSlot(slot) {
  return String(slot || '').replace(/[–—]/g, '-').trim();
}

function parseTimeOnDate(timeText, bookingDate) {
  const y = bookingDate.getFullYear();
  const m = String(bookingDate.getMonth() + 1).padStart(2, '0');
  const d = String(bookingDate.getDate()).padStart(2, '0');
  const combined = `${y}-${m}-${d} ${timeText.trim()}`;
  const parsed = new Date(combined);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function tryParseTimeSlot(timeSlot, bookingDate) {
  const normalized = normalizeSlot(timeSlot);
  const parts = normalized.split('-').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const start = parseTimeOnDate(parts[0], bookingDate);
  let end = parseTimeOnDate(parts[1], bookingDate);
  if (!start || !end) return null;
  if (end <= start) {
    end = new Date(end);
    end.setDate(end.getDate() + 1);
  }
  return { start, end };
}

export function slotsOverlap(slotA, dateA, slotB, dateB) {
  const a = tryParseTimeSlot(slotA, dateA);
  const b = tryParseTimeSlot(slotB, dateB);

  if (!a || !b) {
    return (
      normalizeSlot(slotA).toLowerCase() === normalizeSlot(slotB).toLowerCase()
      && dateA.toDateString() === dateB.toDateString()
    );
  }
  return a.start < b.end && b.start < a.end;
}

export function bookingDateKey(booking) {
  const raw = booking?.bookingDate || booking?.BookingDate;
  if (!raw) return '';
  const d = new Date(raw);
  return d.toISOString().slice(0, 10);
}

export function hasStudentOverlap(studentBookings, selectedTime, selectedDate, excludeStatuses = ['Cancelled']) {
  const dateStr = selectedDate.toISOString().slice(0, 10);
  return (studentBookings || []).some((b) => {
    const status = String(b.status || b.Status || '').toLowerCase();
    if (excludeStatuses.map((s) => s.toLowerCase()).includes(status)) return false;
    const bDate = new Date(b.bookingDate || b.BookingDate);
    if (bookingDateKey(b) !== dateStr && bDate.toISOString().slice(0, 10) !== dateStr) return false;
    const slot = b.timeSlot || b.TimeSlot;
    return slotsOverlap(selectedTime, selectedDate, slot, bDate);
  });
}

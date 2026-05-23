import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import AnimatedSection from '../../components/ui/AnimatedSection.jsx';
import {
  fetchTutorById,
  createBooking,
  fetchBookedSlots,
  fetchPlatformCatalogGrouped,
  fetchStudentOnboardingProfile,
  fetchStudentBookings,
  fetchTutorBatchesForTutor,
  enrollInBatch,
  canEnrollInBatch,
} from '../../services/authApi.js';
import BatchEnrollmentPicker from '../../components/booking/BatchEnrollmentPicker.jsx';
import { canBookWithProfile, MIN_BOOKING_COMPLETENESS } from '../../utils/studentProfile.js';
import { hasStudentOverlap } from '../../utils/bookingSlots.js';
import PageSkeleton from '../../components/ui/PageSkeleton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { resolvePublicAssetUrl } from '../../utils/urls.js';
import { normalizeTutorForScheduling } from '../../utils/tutorProfile.js';
import { normalizeTutorBatch, unwrapApiList } from '../../utils/apiData.js';

const MotionDiv = motion.div;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_MAP = {
  'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
};

function Scheduling() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [tutor, setTutor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [mode, setMode] = useState('Video Session');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalogSlots, setCatalogSlots] = useState([]);
  const [studentBookings, setStudentBookings] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [publishedBatches, setPublishedBatches] = useState([]);
  const [allTutorBatches, setAllTutorBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [flowMode, setFlowMode] = useState('batch');

  useEffect(() => {
    const verifyProfile = async () => {
      if (!token) return;
      try {
        const profile = await fetchStudentOnboardingProfile(token);
        const completeness = profile?.profileCompleteness ?? 0;
        if (!canBookWithProfile(completeness)) {
          toast.error(`Complete at least ${MIN_BOOKING_COMPLETENESS}% of your profile to book (currently ${completeness}%)`);
          navigate('/student-profile');
        }
      } catch {
        toast.error('Please complete your student profile before booking');
        navigate('/student-profile');
      }
    };
    verifyProfile();
  }, [token, navigate]);

  useEffect(() => {
    const loadTutor = async () => {
      try {
        const [data, catalog, batchList] = await Promise.all([
          fetchTutorById(tutorId),
          fetchPlatformCatalogGrouped().catch(() => ({})),
          fetchTutorBatchesForTutor(tutorId).catch(() => []),
        ]);
        const normalized = normalizeTutorForScheduling(data);
        const tutorProfileId = normalized.id || normalized.tutorProfileId || tutorId;
        if (!normalized.availableTimeSlots?.length && catalog?.time_slot) {
          normalized.availableTimeSlots = catalog.time_slot.map((item) => item.label || item.value);
        }
        if (!normalized.availableDays?.length && catalog?.day_of_week) {
          normalized.availableDays = catalog.day_of_week.map((item) => item.label || item.value);
        }
        if (!normalized.availableDays?.length) {
          normalized.availableDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        }
        setCatalogSlots(normalized.availableTimeSlots);
        setTutor({ ...normalized, id: tutorProfileId });

        let batches = unwrapApiList(batchList).map(normalizeTutorBatch).filter(Boolean);
        if (batches.length === 0 && tutorProfileId) {
          try {
            const retry = await fetchTutorBatchesForTutor(tutorProfileId);
            batches = unwrapApiList(retry).map(normalizeTutorBatch).filter(Boolean);
          } catch {
            batches = [];
          }
        }
        setAllTutorBatches(batches);
        const openBatches = batches.filter((b) => !b.isFull);
        setPublishedBatches(openBatches.length > 0 ? openBatches : batches);
        setFlowMode(batches.length > 0 ? 'batch' : 'hourly');
        if (normalized.subjects?.length > 0) {
          setSubject(normalized.subjects[0]);
        }
      } catch {
        toast.error('Failed to load tutor details');
        navigate('/tutors');
      } finally {
        setIsLoading(false);
      }
    };
    loadTutor();
  }, [tutorId, navigate]);

  useEffect(() => {
    const loadStudentBookings = async () => {
      if (!token) return;
      try {
        const list = await fetchStudentBookings(token);
        setStudentBookings(Array.isArray(list) ? list : []);
      } catch {
        setStudentBookings([]);
      }
    };
    loadStudentBookings();
  }, [token]);

  useEffect(() => {
    if (flowMode !== 'hourly' || !selectedDay) return;
    const loadBookedSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const date = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        const slots = await fetchBookedSlots(tutorId, date, token);
        setBookedSlots(Array.isArray(slots) ? slots : []);
      } catch (error) {
        console.error('Failed to load booked slots', error);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    loadBookedSlots();
  }, [selectedDay, selectedMonth, selectedYear, tutorId, token, flowMode]);

  const daysInMonth = useMemo(() => new Date(selectedYear, selectedMonth + 1, 0).getDate(), [selectedMonth, selectedYear]);
  const startDayOfWeek = useMemo(() => new Date(selectedYear, selectedMonth, 1).getDay(), [selectedMonth, selectedYear]);

  const availableDayIndices = useMemo(() => {
    if (!tutor?.availableDays) return [];
    return tutor.availableDays.map(d => DAY_MAP[d.trim()] ?? -1).filter(idx => idx !== -1);
  }, [tutor]);

  const isDayAvailable = (day) => {
    const date = new Date(selectedYear, selectedMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    const maxAhead = new Date(today);
    maxAhead.setDate(maxAhead.getDate() + 30);
    if (date > maxAhead) return false;
    const iso = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const unavailable = tutor?.unavailableDates || [];
    if (unavailable.some((d) => String(d).slice(0, 10) === iso)) return false;
    return availableDayIndices.includes(date.getDay());
  };

  const handleMonthChange = (direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    else if (newMonth < 0) { newMonth = 11; newYear--; }
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    setSelectedDay(null);
    setSelectedTime(null);
  };

  const selectedBookingDate = useMemo(() => {
    if (!selectedDay) return null;
    return new Date(selectedYear, selectedMonth, selectedDay);
  }, [selectedDay, selectedMonth, selectedYear]);

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
    setSubject(batch.subject || subject);
    setShowReview(false);
  };

  const handleOpenReview = () => {
    if (flowMode === 'batch') {
      if (!selectedBatch) {
        toast.error('Please select a course batch to enroll');
        return;
      }
      setShowReview(true);
      return;
    }
    if (!subject) { toast.error('Please select a subject first'); return; }
    if (!selectedDay || !selectedTime) { toast.error('Please select a date and time slot'); return; }
    if (selectedBookingDate && hasStudentOverlap(studentBookings, selectedTime, selectedBookingDate)) {
      toast.error('You already have a session at this time. Pick a non-overlapping slot.');
      return;
    }
    setShowReview(true);
  };

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    try {
      if (flowMode === 'batch') {
        if (!selectedBatch?.id) { toast.error('Select a course batch first'); return; }
        const check = await canEnrollInBatch({ token, batchId: selectedBatch.id });
        if (check?.canEnroll === false) {
          toast.error(check?.message || 'You cannot enroll in this batch.');
          return;
        }
        await enrollInBatch({ token, batchId: selectedBatch.id, studentNotes: notes });
        toast.success(`Enrolled in "${selectedBatch.title}"! Your class schedule is fixed by the tutor.`);
      } else {
        if (!selectedDay || !selectedTime || !subject) {
          toast.error('Please complete all selection steps');
          return;
        }
        const bookingDate = new Date(Date.UTC(selectedYear, selectedMonth, selectedDay));
        if (hasStudentOverlap(studentBookings, selectedTime, bookingDate)) {
          toast.error('You already have a session at this time. Pick a non-overlapping slot.');
          return;
        }
        await createBooking({
          token,
          payload: {
            tutorProfileId: tutorId,
            bookingDate: bookingDate.toISOString(),
            timeSlot: selectedTime,
            sessionMode: mode,
            subject,
            studentNotes: notes,
            billingPlan: 'hourly',
            planMonths: 1,
          },
        });
        toast.success(`Session request sent (${mode})! Check My Courses for status and location.`);
      }
      setTimeout(() => navigate(flowMode === 'batch' ? '/student/enrollments' : '/student/enrollments?tab=sessions'), 2000);
    } catch (error) {
      toast.error(error.message || 'Failed to complete enrollment');
    } finally {
      setIsSubmitting(false);
      setShowReview(false);
    }
  };

  const displaySlots = tutor?.availableTimeSlots?.length ? tutor.availableTimeSlots : catalogSlots;

  const estimatedPrice = useMemo(() => {
    if (flowMode === 'batch' && selectedBatch) return Number(selectedBatch.packageFee) || 0;
    return Number(tutor?.hourlyFee) || 0;
  }, [flowMode, selectedBatch, tutor?.hourlyFee]);

  const selectedBatchIsOnline = selectedBatch?.isOnline
    ?? String(selectedBatch?.sessionMode || '').toLowerCase().includes('online');

  const normalizeSlot = (slot) => String(slot || '').trim().toLowerCase();

  const availableSlotsOnly = useMemo(() => {
    if (!selectedDay || !displaySlots?.length || !selectedBookingDate) return [];
    const booked = new Set(bookedSlots.map(normalizeSlot));
    return displaySlots.filter((slot) => {
      const label = normalizeSlot(slot);
      if (booked.has(label)) return false;
      if (bookedSlots.some((b) => {
        const bNorm = normalizeSlot(b);
        return bNorm.includes(label) || label.includes(bNorm);
      })) return false;
      if (hasStudentOverlap(studentBookings, String(slot).trim(), selectedBookingDate)) return false;
      return true;
    });
  }, [displaySlots, bookedSlots, selectedDay, selectedBookingDate, studentBookings]);

  if (isLoading) {
    return (
      <motion.div className="mx-auto max-w-6xl py-8">
        <PageSkeleton rows={4} />
      </motion.div>
    );
  }

  return (
    <motion.div className="mx-auto max-w-6xl space-y-8">
      <AnimatedSection className="glass-panel overflow-hidden rounded-[2.5rem] p-0 shadow-2xl shadow-indigo-500/5" delay={0.05}>
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-white/20 shadow-xl">
              {tutor?.profilePhotoUrl ? (
                <img
                  src={tutor.profilePhotoUrl.startsWith('http') ? tutor.profilePhotoUrl : resolvePublicAssetUrl(tutor.profilePhotoUrl, 'profiles')}
                  alt={tutor?.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <motion.div className="flex h-full w-full items-center justify-center bg-white/10 text-3xl font-bold uppercase">
                  {tutor?.fullName?.charAt(0)}
                </motion.div>
              )}
            </div>
            <motion.div className="text-center sm:text-left">
              <h1 className="font-heading text-3xl font-black">{tutor?.fullName}</h1>
              <p className="text-indigo-100">{tutor?.highestDegree} • {tutor?.teachingMode}</p>
              <motion.div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                {tutor?.subjects?.map(s => (
                  <span key={s} className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider">{s}</span>
                ))}
              </motion.div>
            </motion.div>
            <motion.div className="sm:ml-auto text-center sm:text-right">
              <p className="text-xs font-black uppercase tracking-widest text-indigo-200">Hourly Rate</p>
              <p className="font-heading text-4xl font-black">${tutor?.hourlyFee}</p>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {!showReview && (
        <AnimatedSection className="glass-panel rounded-[2.5rem] p-6" delay={0.06}>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Booking type</p>
          <motion.div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={allTutorBatches.length === 0}
              onClick={() => { setFlowMode('batch'); setShowReview(false); }}
              className={`rounded-2xl px-6 py-3 text-sm font-bold transition ${
                flowMode === 'batch'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              } ${allTutorBatches.length === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              Join a course batch
              {allTutorBatches.length > 0 && (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">{allTutorBatches.length}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setFlowMode('hourly'); setSelectedBatch(null); setShowReview(false); }}
              className={`rounded-2xl px-6 py-3 text-sm font-bold transition ${
                flowMode === 'hourly'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Book single session
            </button>
          </motion.div>
          <p className="mt-3 text-sm text-slate-500">
            {allTutorBatches.length === 0
              ? 'This tutor has no published course batches yet — book a single hourly session below.'
              : flowMode === 'batch'
                ? 'Pick a tutor-created batch — fixed weekly schedule and package fee. Class sessions are already generated.'
                : 'Book one session at a time. Choose your own date and available time slot.'}
          </p>
        </AnimatedSection>
      )}

      {!showReview && flowMode === 'batch' && allTutorBatches.length > 0 && (
        <AnimatedSection className="glass-panel rounded-[2.5rem] p-8" delay={0.08}>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Step 1</p>
          <h2 className="mt-1 font-heading text-2xl font-black text-slate-900">Choose a course batch</h2>
          <p className="mt-1 text-sm text-slate-500">
            Group classes with fixed weekly schedule. Multiple students join the same live session.
          </p>
          {publishedBatches.every((b) => b.isFull) && (
            <p className="mt-3 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              All batches are currently full. You can still book a single hourly session instead.
            </p>
          )}
          <motion.div className="mt-6">
            <BatchEnrollmentPicker
              batches={publishedBatches}
              selectedBatchId={selectedBatch?.id}
              onSelect={handleSelectBatch}
            />
          </motion.div>
          <motion.div className="mt-8">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Note for tutor (optional)</label>
            <textarea
              placeholder="Learning goals, level, or questions…"
              className="mt-2 w-full rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </motion.div>
        </AnimatedSection>
      )}

      {!showReview && flowMode === 'hourly' && (
        <AnimatedSection className="glass-panel rounded-[2.5rem] border-2 border-indigo-200/60 p-8" delay={0.08}>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Required</p>
          <h2 className="mt-1 font-heading text-2xl font-black text-slate-900">Subject & session mode</h2>
          <motion.div className="mt-6 grid gap-6 md:grid-cols-2">
            <motion.div>
              <label className="mh-field-label">Subject *</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mh-field" required>
                <option value="">Select subject</option>
                {tutor?.subjects?.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </motion.div>
            <motion.div>
              <label className="mh-field-label">Session mode *</label>
              <motion.div className="mt-2 flex gap-2">
                {['Video Session', 'In-Person'].map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className={`flex-1 rounded-2xl py-3 text-sm font-bold ${mode === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {m}
                  </button>
                ))}
              </motion.div>
              <p className="mt-2 text-sm text-slate-500">${tutor?.hourlyFee}/hr · one session</p>
            </motion.div>
          </motion.div>
        </AnimatedSection>
      )}

      {!showReview && flowMode === 'hourly' && (
      <motion.div className="grid gap-8 lg:grid-cols-2">
        <AnimatedSection className="glass-panel rounded-[2.5rem] p-8" delay={0.1}>
          <motion.div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-black text-slate-900">Select date</h2>
            <motion.div className="flex items-center gap-4">
              <button type="button" onClick={() => handleMonthChange(-1)} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="min-w-[120px] text-center font-bold text-slate-900">{MONTHS[selectedMonth]} {selectedYear}</span>
              <button type="button" onClick={() => handleMonthChange(1)} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </motion.div>
          </motion.div>
          <motion.div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <motion.div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{d}</motion.div>
            ))}
            {Array.from({ length: startDayOfWeek }).map((_, i) => <motion.div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = selectedDay === day;
              const available = isDayAvailable(day);
              const isToday = new Date().getDate() === day && new Date().getMonth() === selectedMonth && new Date().getFullYear() === selectedYear;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={!available}
                  onClick={() => { setSelectedDay(day); setSelectedTime(null); }}
                  className={`relative flex aspect-square items-center justify-center rounded-2xl text-sm font-bold transition-all ${
                    isSelected ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg z-10 scale-105'
                      : available ? 'bg-white text-slate-700 hover:bg-indigo-50 border border-slate-100'
                      : 'bg-slate-50 text-slate-300 border border-slate-50 cursor-not-allowed grayscale'
                  } ${isToday && !isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                >
                  {day}
                </button>
              );
            })}
          </motion.div>
        </AnimatedSection>

        <AnimatedSection className="glass-panel rounded-[2.5rem] p-8" delay={0.15}>
          <h2 className="font-heading text-2xl font-black text-slate-900">Pick time slot</h2>
          <p className="mt-1 text-sm text-slate-500">
            {selectedDay ? `${selectedDay} ${MONTHS[selectedMonth]} ${selectedYear}` : 'Select an available date first'}
          </p>
          <motion.div className="mt-6 relative min-h-[200px]">
            {isLoadingSlots ? (
              <motion.div className="absolute inset-0 flex items-center justify-center">
                <motion.div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </motion.div>
            ) : selectedDay ? (
              availableSlotsOnly.length > 0 ? (
                <motion.div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {availableSlotsOnly.map((time) => {
                    const slotLabel = String(time).trim();
                    return (
                      <button
                        key={slotLabel}
                        type="button"
                        onClick={() => setSelectedTime(slotLabel)}
                        className={`rounded-2xl border py-4 text-xs font-bold transition-all ${
                          selectedTime === slotLabel
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                            : 'border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] text-[var(--mh-text)] hover:border-indigo-400'
                        }`}
                      >
                        {slotLabel}
                      </button>
                    );
                  })}
                </motion.div>
              ) : (
                <p className="py-8 text-center text-sm text-[var(--mh-text-muted)]">All slots booked for this date. Choose another day.</p>
              )
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">Select a date to see available slots</p>
            )}
          </motion.div>
          <motion.div className="mt-8">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Note for tutor (optional)</label>
            <textarea
              className="mt-2 w-full rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </motion.div>
        </AnimatedSection>
      </motion.div>
      )}

      <AnimatePresence>
        {showReview ? (
          <MotionDiv
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass-panel rounded-[2.5rem] border border-indigo-200 p-8 shadow-xl"
          >
            <h2 className="font-heading text-2xl font-black text-slate-900">
              {flowMode === 'batch' ? 'Review & confirm enrollment' : 'Review & confirm booking'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {flowMode === 'batch'
                ? 'Your class schedule is set by the tutor — you do not pick dates or times separately.'
                : 'Check details before sending your request to the tutor.'}
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              {(flowMode === 'batch' && selectedBatch
                ? [
                    ['Tutor', tutor?.fullName],
                    ['Course batch', selectedBatch.title],
                    ['Subject', selectedBatch.subject],
                    ['Class schedule', selectedBatch.scheduleLabel || `${selectedBatch.daysOfWeekCsv} · ${selectedBatch.startTime}–${selectedBatch.endTime}`],
                    ['Package period', `${new Date(selectedBatch.startDateUtc).toLocaleDateString()} → ${new Date(selectedBatch.endDateUtc).toLocaleDateString()}`],
                    ['Format', selectedBatchIsOnline ? 'Live video conference (group)' : 'In-person group class'],
                    ['Access', 'Meeting link / location shared after enrollment only'],
                    ['Package fee', `$${estimatedPrice.toFixed(0)}`],
                  ].filter(Boolean)
                : [
                    ['Tutor', tutor?.fullName],
                    ['Subject', subject],
                    ['Date', selectedDay ? `${selectedDay} ${MONTHS[selectedMonth]} ${selectedYear}` : '—'],
                    ['Time slot', selectedTime],
                    ['Session mode', mode],
                    ['Total', `$${estimatedPrice.toFixed(0)} (1 session)`],
                  ]
              ).map(([label, value]) => (
                <motion.div key={label} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-900">{value}</dd>
                </motion.div>
              ))}
            </dl>
            {notes ? (
              <p className="mt-4 rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                <span className="font-bold">Note: </span>{notes}
              </p>
            ) : null}
            <motion.div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => setShowReview(false)} className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Back to edit
              </button>
              <button type="button" onClick={handleConfirmBooking} disabled={isSubmitting} className="glow-button rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3 text-sm font-black text-white disabled:opacity-50">
                {isSubmitting ? 'Submitting…' : flowMode === 'batch' ? 'Confirm enrollment' : 'Submit booking request'}
              </button>
            </motion.div>
          </MotionDiv>
        ) : null}
      </AnimatePresence>

      {!showReview && (
      <AnimatedSection className="glass-panel sticky bottom-6 z-50 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[2rem] p-6 shadow-2xl border border-white/50" delay={0.2}>
        <motion.div className="flex items-center gap-8">
          {flowMode === 'batch' ? (
            <>
              <motion.div className="hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selected batch</p>
                <p className="text-sm font-bold text-slate-900">{selectedBatch?.title || '—'}</p>
              </motion.div>
              <motion.div className="hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Schedule</p>
                <p className="text-sm font-bold text-slate-900">
                  {selectedBatch?.scheduleLabel || (selectedBatch ? `${selectedBatch.startTime}–${selectedBatch.endTime}` : '—')}
                </p>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div className="hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                <p className="text-sm font-bold text-slate-900">{selectedDay ? `${selectedDay} ${MONTHS[selectedMonth]}` : '—'}</p>
              </motion.div>
              <motion.div className="hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time</p>
                <p className="text-sm font-bold text-slate-900">{selectedTime || '—'}</p>
              </motion.div>
            </>
          )}
          <motion.div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {flowMode === 'batch' ? 'Package fee' : 'Session fee'}
            </p>
            <p className="font-heading text-2xl font-black text-indigo-600">
              ${estimatedPrice.toFixed(0)}
              {flowMode === 'hourly' && <span className="ml-1 text-xs font-semibold text-slate-500">/ session</span>}
            </p>
          </motion.div>
        </motion.div>
        <button
          type="button"
          onClick={showReview ? handleConfirmBooking : handleOpenReview}
          disabled={isSubmitting || (flowMode === 'batch' ? !selectedBatch : !subject || !selectedDay || !selectedTime)}
          className="glow-button flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-10 py-4 font-black text-white shadow-xl disabled:opacity-50"
        >
          {isSubmitting ? 'Processing…' : (showReview ? (flowMode === 'batch' ? 'Confirm enrollment' : 'Confirm booking') : (flowMode === 'batch' ? 'Review enrollment' : 'Review booking'))}
        </button>
      </AnimatedSection>
      )}
    </motion.div>
  );
}

export default Scheduling;

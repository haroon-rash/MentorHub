import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.jsx';
import PageSkeleton from '../../components/ui/PageSkeleton.jsx';
import {
  fetchMyEnrollments,
  fetchBatchSessions,
  fetchEnrollmentBillingPeriods,
  fetchReviewPrompts,
  fetchStudentBookings,
} from '../../services/authApi.js';
import { normalizeBooking, unwrapBookings, bookingLocationDisplay } from '../../utils/bookingData.js';
import { normalizeEnrollment, unwrapApiList } from '../../utils/apiData.js';
import ReviewCourseCard from '../../components/reviews/ReviewCourseCard.jsx';
import EarlyLeaveWizard from './EarlyLeaveWizard.jsx';
import CancelSessionWizard from './CancelSessionWizard.jsx';

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const tone =
    s === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
    s === 'completed' ? 'bg-indigo-500/20 text-indigo-300' :
    s === 'withdrawn' ? 'bg-amber-500/20 text-amber-300' :
    s === 'pending' ? 'bg-amber-500/20 text-amber-300' :
    s === 'expired' ? 'bg-slate-500/20 text-slate-400' :
    'bg-rose-500/20 text-rose-300';
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${tone}`}>
      {status}
    </span>
  );
}

function BillingTimeline({ enrollmentId, token }) {
  const [periods, setPeriods] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const list = await fetchEnrollmentBillingPeriods({ token, enrollmentId });
      setPeriods(Array.isArray(list) ? list : []);
      setOpen(true);
    } catch (err) {
      toast.error(err.message || 'Could not load billing periods');
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={load} className="text-xs font-bold text-indigo-400 hover:underline">
        View billing timeline →
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-black uppercase tracking-widest text-[var(--mh-text-muted)]">Monthly billing (ledger only)</p>
      <ul className="space-y-1 text-xs">
        {periods.map((p) => (
          <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-[var(--mh-bg-elevated)] px-3 py-2">
            <span>
              Period {p.periodIndex}: {new Date(p.periodStartUtc).toLocaleDateString()} – {new Date(p.periodEndUtc).toLocaleDateString()}
            </span>
            <span className="font-bold">
              ${p.feeAmount} · <span className="text-indigo-400">{p.status}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EnrollmentSessions({ enrollment, token }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadSessions = async () => {
    if (!token || !enrollment.tutorBatchId) return;
    setLoading(true);
    try {
      const list = await fetchBatchSessions({ batchId: enrollment.tutorBatchId, token });
      setSessions(Array.isArray(list) ? list : []);
      setOpen(true);
    } catch (err) {
      toast.error(err.message || 'Could not load sessions');
    } finally {
      setLoading(false);
    }
  };

  const upcoming = sessions.filter((s) => new Date(s.sessionDateUtc) >= new Date()).slice(0, 5);

  return (
    <div className="mt-4 border-t border-[var(--mh-border)] pt-4">
      <button type="button" onClick={loadSessions} disabled={loading} className="text-xs font-bold text-indigo-400 hover:underline disabled:opacity-50">
        {loading ? 'Loading sessions…' : open ? 'Refresh class schedule' : 'View class schedule & join links →'}
      </button>
      {open && upcoming.length > 0 && (
        <ul className="mt-3 space-y-2">
          {upcoming.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--mh-bg-elevated)] px-3 py-2 text-sm">
              <span>{new Date(s.sessionDateUtc).toLocaleDateString()} · {s.timeSlotLabel}</span>
              {s.meetingLink ? (
                <a href={s.meetingLink} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700">
                  Join securely
                </a>
              ) : s.location ? (
                <span className="text-xs text-[var(--mh-text-muted)]">📍 {s.location}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {enrollment.locationOrMeetingInfo && (
        <p className="mt-2 text-xs text-[var(--mh-text-muted)]">
          {enrollment.sessionMode === 'Online' ? '🎥' : '📍'} {enrollment.locationOrMeetingInfo}
        </p>
      )}
    </div>
  );
}

function enrollmentStatusKey(status) {
  return String(status || '').toLowerCase();
}

function isActiveEnrollment(e) {
  const s = enrollmentStatusKey(e.status);
  return s === 'active' || s === 'pending';
}

function WithdrawnEnrollmentCard({ enrollment, reviewItems, token, onReviewSubmitted }) {
  const ended = enrollment.effectiveEndDateUtc || enrollment.completionDateUtc || enrollment.endDateUtc;
  const withdrawnAt = enrollment.withdrawalRequestedAtUtc;
  const reason = enrollment.withdrawalReason?.trim();

  return (
    <article className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Withdrawn course</p>
          <h3 className="mt-1 text-lg font-bold text-[var(--mh-text)]">{enrollment.batchTitle || enrollment.subject}</h3>
          <p className="text-sm text-indigo-400">{enrollment.subject} with {enrollment.tutorName}</p>
        </div>
        <StatusBadge status="Withdrawn" />
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {withdrawnAt && (
          <div>
            <dt className="text-[var(--mh-text-subtle)]">Withdrawn on</dt>
            <dd className="font-semibold">{new Date(withdrawnAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</dd>
          </div>
        )}
        {ended && (
          <div>
            <dt className="text-[var(--mh-text-subtle)]">Effective end</dt>
            <dd className="font-semibold">{new Date(ended).toLocaleDateString(undefined, { dateStyle: 'medium' })}</dd>
          </div>
        )}
        <div>
          <dt className="text-[var(--mh-text-subtle)]">Original period</dt>
          <dd className="font-semibold">
            {new Date(enrollment.startDateUtc).toLocaleDateString()} — {new Date(enrollment.endDateUtc).toLocaleDateString()}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--mh-text-subtle)]">Package</dt>
          <dd className="font-semibold">${enrollment.amountPaid} · {enrollment.planMonths || 1} mo</dd>
        </div>
      </dl>
      {reason && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-[var(--mh-bg)]/60 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300/90">Your withdrawal notes</p>
          <p className="mt-1 text-sm text-[var(--mh-text-muted)]">{reason}</p>
        </div>
      )}
      <p className="mt-3 text-xs text-[var(--mh-text-muted)]">
        Billing under the 5-day grace policy is recorded in your ledger. You may leave a course review within 10 days of withdrawal.
      </p>
      <div className="mt-4">
        <ReviewCourseCard
          enrollment={mergeReviewStatus(enrollment, reviewItems)}
          token={token}
          onReviewSubmitted={onReviewSubmitted}
        />
      </div>
    </article>
  );
}

function PastEnrollmentCard({ enrollment, reviewItems, token, onReviewSubmitted }) {
  if (enrollmentStatusKey(enrollment.status) === 'withdrawn') {
    return (
      <WithdrawnEnrollmentCard
        enrollment={enrollment}
        reviewItems={reviewItems}
        token={token}
        onReviewSubmitted={onReviewSubmitted}
      />
    );
  }
  return (
    <article className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-4 opacity-90">
      <div className="flex justify-between gap-2">
        <p className="font-semibold">{enrollment.batchTitle} · {enrollment.subject}</p>
        <StatusBadge status={enrollment.status} />
      </div>
      <p className="mt-1 text-xs text-[var(--mh-text-muted)]">{enrollment.tutorName}</p>
      <div className="mt-3">
        <ReviewCourseCard
          enrollment={mergeReviewStatus(enrollment, reviewItems)}
          token={token}
          onReviewSubmitted={onReviewSubmitted}
        />
      </div>
    </article>
  );
}

function mergeReviewStatus(enrollment, reviewItems) {
  const match = reviewItems.find((r) => r.enrollmentId === enrollment.id);
  if (!match) {
    return {
      ...enrollment,
      canReview: false,
      alreadyReviewed: false,
      reason: ['Active', 'Pending'].includes(String(enrollment.status))
        ? 'Reviews open after you complete, expire, or withdraw from the course.'
        : String(enrollment.status).toLowerCase() === 'withdrawn'
          ? 'You can review within 10 days of withdrawal.'
          : 'Not eligible for review.',
    };
  }
  return { ...enrollment, ...match, id: enrollment.id };
}

export default function StudentEnrollmentsPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const [list, reviews, bookingList] = await Promise.all([
        fetchMyEnrollments(token),
        fetchReviewPrompts(token).catch(() => []),
        fetchStudentBookings(token).catch(() => []),
      ]);
      setEnrollments(unwrapApiList(list).map(normalizeEnrollment).filter(Boolean));
      setBookings(unwrapBookings(bookingList).map(normalizeBooking).filter(Boolean));
      setReviewItems(Array.isArray(reviews) ? reviews : []);
    } catch {
      if (!silent) toast.error('Could not load your enrollments.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(true), 30000);
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!loading && searchParams.get('tab') === 'sessions' && sessionsRef.current) {
      sessionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, searchParams]);

  if (loading) return <PageSkeleton rows={5} />;

  const active = enrollments.filter(isActiveEnrollment);
  const past = enrollments.filter((e) => !isActiveEnrollment(e));
  const withdrawn = past.filter((e) => enrollmentStatusKey(e.status) === 'withdrawn');
  const pastOther = past.filter((e) => enrollmentStatusKey(e.status) !== 'withdrawn');
  const pendingReviewCount = reviewItems.filter((r) => r.canReview).length;

  const activeBookings = bookings.filter((b) => {
    const s = String(b.status || '').toLowerCase();
    return s !== 'cancelled' && s !== 'completed';
  });
  const pastBookings = bookings.filter((b) => {
    const s = String(b.status || '').toLowerCase();
    return s === 'cancelled' || s === 'completed';
  });

  return (
    <motion.div className="mx-auto max-w-4xl space-y-6">
      <div className="glass-panel rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-indigo-500">My learning</p>
        <h1 className="mt-1 font-heading text-3xl font-black text-[var(--mh-text)]">My Courses & Packages</h1>
        <p className="mt-2 text-sm text-[var(--mh-text-muted)]">
          Course batches and single-session bookings (online or in-person) appear below.
        </p>
        {pendingReviewCount > 0 ? (
          <Link
            to="/student/reviews"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg"
          >
            ⭐ {pendingReviewCount} course{pendingReviewCount > 1 ? 's' : ''} ready to review
          </Link>
        ) : (
          <Link to="/student/reviews" className="mt-3 inline-block text-xs font-bold text-indigo-400 hover:underline">
            My reviews →
          </Link>
        )}
      </div>

      <section ref={sessionsRef}>
        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-[var(--mh-text-muted)]">
          Single sessions ({activeBookings.length})
        </h2>
        {activeBookings.length === 0 ? (
          <motion.div className="glass-panel mb-8 rounded-2xl p-8 text-center">
            <p className="text-[var(--mh-text-muted)]">No single-session bookings yet.</p>
            <Link to="/tutors" className="mt-4 inline-block text-sm font-bold text-indigo-400 hover:underline">Book a tutor →</Link>
          </motion.div>
        ) : (
          <div className="mb-8 space-y-4">
            {activeBookings.map((b) => (
              <article key={b.id} className="glass-panel rounded-2xl border border-violet-500/25 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Single session</p>
                    <h3 className="text-lg font-bold text-[var(--mh-text)]">{b.subject} with {b.tutorName}</h3>
                    <p className="mt-1 text-sm text-[var(--mh-text-muted)]">
                      {new Date(b.bookingDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{b.timeSlot}
                    </p>
                    <p className="mt-2 text-xs font-bold text-indigo-400">
                      {b.isInPerson ? '📍 In-person' : '🎥 Online'} · ${b.fee}/session
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-4 rounded-xl bg-indigo-500/10 px-4 py-3 text-sm">
                  {b.isInPerson ? (
                    <p className="text-[var(--mh-text-muted)]">
                      <span className="font-bold text-[var(--mh-text)]">Location: </span>
                      {bookingLocationDisplay(b)}
                    </p>
                  ) : b.meetingLink && String(b.status).toLowerCase() !== 'pending' ? (
                    <a href={b.meetingLink} target="_blank" rel="noreferrer" className="font-bold text-indigo-400 hover:underline">Join meeting →</a>
                  ) : (
                    <p className="text-xs text-[var(--mh-text-muted)]">{bookingLocationDisplay(b)}</p>
                  )}
                </div>
                {b.studentNotes && (
                  <p className="mt-2 text-xs text-[var(--mh-text-subtle)]">Your note: {b.studentNotes}</p>
                )}
                <CancelSessionWizard booking={b} token={token} onDone={load} />
                <Link to="/student/materials" className="mt-4 inline-block text-xs font-bold text-indigo-400 hover:underline">
                  Study materials for this subject →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-[var(--mh-text-muted)]">Course batches ({active.length})</h2>
        {active.length === 0 ? (
          <motion.div className="glass-panel rounded-2xl p-8 text-center">
            <p className="text-[var(--mh-text-muted)]">No active packages.</p>
            <Link to="/tutors" className="mt-4 inline-block text-sm font-bold text-indigo-400 hover:underline">Find a tutor →</Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {active.map((e) => (
              <article key={e.id} className="glass-panel rounded-2xl border border-indigo-500/20 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--mh-text)]">{e.batchTitle || e.subject}</h3>
                    <p className="text-sm text-indigo-400">{e.subject} with {e.tutorName}</p>
                    {e.scheduleLabel && <p className="mt-1 text-xs text-[var(--mh-text-muted)]">🕐 {e.scheduleLabel}</p>}
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-[var(--mh-text-subtle)]">Period</dt><dd className="font-semibold">{new Date(e.startDateUtc).toLocaleDateString()} — {new Date(e.endDateUtc).toLocaleDateString()}</dd></div>
                  <div><dt className="text-[var(--mh-text-subtle)]">Package</dt><dd className="font-semibold">${e.amountPaid} · {e.planMonths || 1} mo</dd></div>
                </dl>
                <BillingTimeline enrollmentId={e.id} token={token} />
                <EarlyLeaveWizard enrollment={e} token={token} onDone={load} />
                <div className="mt-4">
                  <ReviewCourseCard
                    enrollment={mergeReviewStatus(e, reviewItems)}
                    token={token}
                    onReviewSubmitted={load}
                  />
                </div>
                <EnrollmentSessions enrollment={e} token={token} />
                <div className="mt-4 flex flex-wrap gap-4">
                  <Link to="/student/assignments" className="text-xs font-bold text-indigo-400 hover:underline">Assignments →</Link>
                  <Link to="/student/materials" className="text-xs font-bold text-indigo-400 hover:underline">Study materials →</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {withdrawn.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-amber-400/90">
            Withdrawn courses ({withdrawn.length})
          </h2>
          <div className="space-y-4">
            {withdrawn.map((e) => (
              <WithdrawnEnrollmentCard
                key={e.id}
                enrollment={e}
                reviewItems={reviewItems}
                token={token}
                onReviewSubmitted={load}
              />
            ))}
          </div>
        </section>
      )}

      {(pastBookings.length > 0 || pastOther.length > 0) && (
        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-[var(--mh-text-muted)]">Past</h2>
          {pastBookings.length > 0 && (
            <div className="mb-4 space-y-2">
              {pastBookings.map((b) => (
                <article key={b.id} className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-4 opacity-90">
                  <div className="flex justify-between gap-2">
                    <p className="font-semibold">{b.subject} · {b.tutorName} (single session)</p>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--mh-text-muted)]">
                    {new Date(b.bookingDate).toLocaleDateString()} · {b.timeSlot} · {b.isInPerson ? 'In-person' : 'Online'}
                  </p>
                </article>
              ))}
            </div>
          )}
          <div className="space-y-3">
            {pastOther.map((e) => (
              <PastEnrollmentCard
                key={e.id}
                enrollment={e}
                reviewItems={reviewItems}
                token={token}
                onReviewSubmitted={load}
              />
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}

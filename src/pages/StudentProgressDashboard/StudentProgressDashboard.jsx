import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  fetchStudentProgress,
  getStudentAnnouncements,
  fetchStudentBookings,
  fetchMyEnrollments,
  fetchCourseAssignmentsForStudent,
} from '../../services/authApi.js';
import PageSkeleton from '../../components/ui/PageSkeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { normalizeBooking, unwrapBookings } from '../../utils/bookingData.js';
import CancelSessionWizard from '../student/CancelSessionWizard.jsx';

export default function StudentProgressDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [courseAssignments, setCourseAssignments] = useState([]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [res, announcementsRes, bookingsRes, enrollRes, assignRes] = await Promise.all([
        fetchStudentProgress(token),
        getStudentAnnouncements(null, token).catch(() => ({ success: false, data: [] })),
        fetchStudentBookings(token).catch(() => []),
        fetchMyEnrollments(token).catch(() => []),
        fetchCourseAssignmentsForStudent(token).catch(() => []),
      ]);
      setEnrollments(Array.isArray(enrollRes) ? enrollRes.filter((e) => String(e.status) === 'Active') : []);
      setCourseAssignments(Array.isArray(assignRes) ? assignRes : []);
      setData(res);
      const items = announcementsRes?.success && Array.isArray(announcementsRes.data) ? announcementsRes.data : [];
      setAssignments(items.filter((a) => Number(a.announcementType) === 3 || String(a.announcementType).toLowerCase() === 'assignment'));
      const now = new Date();
      const upcoming = unwrapBookings(bookingsRes)
        .map(normalizeBooking)
        .filter(Boolean)
        .filter((b) => {
          const status = String(b.status || '').toLowerCase();
          if (status === 'cancelled' || status === 'completed') return false;
          const d = new Date(b.bookingDate);
          return !Number.isNaN(d.getTime()) && d >= now;
        })
        .sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate))
        .slice(0, 5);
      setUpcomingBookings(upcoming);
    } catch {
      toast.error('Could not load your progress.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSkeleton rows={5} />;

  const avgScore = data?.assessments?.length
    ? Math.round(data.assessments.reduce((s, a) => s + a.scorePercentage, 0) / data.assessments.length)
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-500/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Learning Hub</p>
            <h1 className="mt-1 font-heading text-3xl font-bold">My Progress Dashboard</h1>
            <p className="mt-2 text-sm text-indigo-200">Your courses, single sessions, and tutor updates in one place.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/student-profile')}
            className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            Update profile
          </button>
        </div>
      </div>

      {avgScore != null && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <motion.div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg-elevated)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Avg score</p>
            <p className="mt-2 font-heading text-4xl font-black text-slate-900 dark:text-[var(--mh-text)]">{avgScore}%</p>
          </motion.div>
          <motion.div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg-elevated)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Active courses</p>
            <p className="mt-2 font-heading text-4xl font-black text-slate-900 dark:text-[var(--mh-text)]">{enrollments.length}</p>
          </motion.div>
          <motion.div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg-elevated)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Upcoming sessions</p>
            <p className="mt-2 font-heading text-4xl font-black text-slate-900 dark:text-[var(--mh-text)]">{upcomingBookings.length}</p>
          </motion.div>
        </div>
      )}

      <section className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm dark:border-indigo-900/40 dark:bg-[var(--mh-bg-elevated)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Enrollments</p>
            <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-[var(--mh-text)]">My active courses</h2>
          </div>
          <button type="button" onClick={() => navigate('/student/enrollments')} className="rounded-xl border border-indigo-200 px-4 py-2 text-xs font-bold text-indigo-600">
            View all courses & sessions
          </button>
        </div>
        {enrollments.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No active course packages yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {enrollments.slice(0, 3).map((e) => (
              <li key={e.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 dark:border-indigo-800">
                <p className="font-bold text-slate-900 dark:text-[var(--mh-text)]">{e.batchTitle} · {e.subject}</p>
                <p className="text-xs text-slate-500">{e.tutorName} · until {new Date(e.endDateUtc).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
        {courseAssignments.length > 0 && (
          <button type="button" onClick={() => navigate('/student/assignments')} className="mt-4 text-sm font-bold text-indigo-600 hover:underline">
            {courseAssignments.length} assignment(s) — open coursework →
          </button>
        )}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg-elevated)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Sessions</p>
            <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-[var(--mh-text)]">Upcoming single sessions</h2>
          </div>
          <button type="button" onClick={() => navigate('/tutors')} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700">
            Book a tutor
          </button>
        </div>
        {upcomingBookings.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No upcoming single sessions"
            description="Book an hourly or in-person session from Find Tutors."
            action={
              <button type="button" onClick={() => navigate('/tutors')} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white">
                Find tutors
              </button>
            }
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {upcomingBookings.map((b) => (
              <li key={b.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-[var(--mh-text)]">{b.tutorName}</p>
                    <p className="text-xs text-slate-500">
                      {b.subject} · {new Date(b.bookingDate).toLocaleDateString()} · {b.timeSlot}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-indigo-500">
                      {b.isInPerson ? '📍 In-person' : '🎥 Online'} · {b.sessionMode}
                    </p>
                    {b.locationOrMeetingInfo && (
                      <p className="mt-1 text-xs text-[var(--mh-text-muted)] line-clamp-2">{b.locationOrMeetingInfo}</p>
                    )}
                    <div className="mt-2">
                      <CancelSessionWizard booking={b} token={token} onDone={load} />
                    </div>
                  </div>
                  <span className="rounded-lg bg-indigo-100 px-2 py-1 text-[10px] font-bold uppercase text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    {b.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => navigate('/student/enrollments')} className="mt-4 text-sm font-bold text-indigo-600 hover:underline">
          All bookings & course packages →
        </button>
      </section>

      {data?.weakSubjects?.length > 0 && (
        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 dark:border-rose-900/40 dark:bg-rose-950/30">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-rose-500">Focus areas</p>
          <div className="flex flex-wrap gap-2">
            {data.weakSubjects.map((w) => (
              <span key={w.topicTag} className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 dark:border-rose-800 dark:bg-[var(--mh-bg-elevated)]">
                {w.topicTag} — {w.averageScore}%
              </span>
            ))}
          </div>
        </div>
      )}

      {assignments.length > 0 && (
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg-elevated)]">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">From your tutors</p>
          <div className="mt-3 space-y-3">
            {assignments.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-800">
                <p className="text-sm font-bold text-slate-900 dark:text-[var(--mh-text)]">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2 dark:text-[var(--mh-text-muted)]">{item.message}</p>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => navigate('/student/announcements')} className="mt-3 text-sm font-semibold text-indigo-600 hover:underline">
            View all announcements →
          </button>
        </section>
      )}
    </div>
  );
}

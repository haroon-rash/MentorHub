import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import WarningBanner from '../../components/tutor/WarningBanner.jsx';
import PageSkeleton from '../../components/ui/PageSkeleton.jsx';
import AdminPriorityBanner from '../../components/admin/AdminPriorityBanner.jsx';
import {
  fetchTutorDashboardStats,
  fetchTutorOnboardingProfile,
  fetchNotifications,
  confirmBooking,
  cancelBooking,
  completeBooking,
  addSessionNote,
} from '../../services/authApi.js';

// ── Session Note Modal ───────────────────────────────────────────────────
function SessionNoteModal({ booking, onClose, onSave }) {
  const [form, setForm] = useState({ topicsCovered: '', remarks: '', areasForImprovement: '', resourceLinksCsv: '' });
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl space-y-4">
        <h3 className="font-heading text-xl font-bold text-slate-900">Submit Session Report</h3>
        <p className="text-sm text-slate-500">Log what was covered and give feedback to help your student improve.</p>
        
        <input placeholder="Topics Covered (e.g. Algebra, Limits) *" value={form.topicsCovered} onChange={set('topicsCovered')}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          
        <textarea placeholder="General Remarks *" value={form.remarks} onChange={set('remarks')} rows={3}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          
        <textarea placeholder="Areas for Improvement (Optional)" value={form.areasForImprovement} onChange={set('areasForImprovement')} rows={2}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          
        <input placeholder="Resource Links (comma separated URLs)" value={form.resourceLinksCsv} onChange={set('resourceLinksCsv')}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => {
            if (form.topicsCovered.trim() && form.remarks.trim()) onSave(booking, form);
            else toast.error('Topics and Remarks are required.');
          }} className="flex-1 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700">Submit Report</button>
        </div>
      </motion.div>
    </div>
  );
}

const STATUS_CONFIG = {
  Pending:   { badge: 'mh-badge-amber',   label: 'Pending'   },
  Confirmed: { badge: 'mh-badge-indigo',  label: 'Confirmed' },
  Completed: { badge: 'mh-badge-emerald', label: 'Completed' },
  Cancelled: { badge: 'mh-badge-rose',    label: 'Cancelled' },
};

const STAT_ACCENTS = {
  indigo: 'border-indigo-200 bg-indigo-50/90 dark:border-indigo-800 dark:bg-indigo-950/40',
  sky: 'border-sky-200 bg-sky-50/90 dark:border-sky-800 dark:bg-sky-950/40',
  amber: 'border-amber-200 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-950/40',
  rose: 'border-rose-200 bg-rose-50/90 dark:border-rose-800 dark:bg-rose-950/40',
};

function StatCard({ label, value, icon, tone = 'indigo', prefix = '' }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const n = Number(value) || 0;
    let frame;
    const dur = 800;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1);
      setDisplay(Math.round(p * n));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <article
      className={`relative overflow-hidden rounded-xl border p-4 ${STAT_ACCENTS[tone] || STAT_ACCENTS.indigo}`}
    >
      <span className="absolute -right-1 -top-1 text-2xl opacity-15" aria-hidden>{icon}</span>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--mh-text-muted)]">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-[var(--mh-text)]">
        {prefix}{display.toLocaleString()}
      </p>
    </article>
  );
}

function BookingCard({ booking, onAction }) {
  const [loading, setLoading] = useState(null);
  const status = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.Pending;
  const date = new Date(booking.bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const act = async (action, label) => {
    setLoading(action);
    try {
      await onAction(action, booking.id);
      toast.success(`Booking ${label}!`);
    } catch (e) {
      toast.error(e.message || `Failed to ${label} booking`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-5 shadow-sm"
    >
      <motion.div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-[var(--mh-text)]">{booking.studentName}</p>
          <p className="mt-1 text-sm text-[var(--mh-text-muted)]">
            <span className="font-semibold text-indigo-400">{booking.subject}</span>
            {' · '}{date} · {booking.timeSlot}
          </p>
          <p className="mt-1 text-xs text-[var(--mh-text-subtle)]">{booking.sessionMode}</p>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${status.badge}`}>
            {status.label}
          </span>
          <p className="text-xl font-black text-indigo-400">${booking.fee}</p>
        </div>
      </motion.div>

      {booking.status === 'Pending' && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => act('confirm', 'confirmed')}
            className="mh-btn-primary flex-1 py-3 text-sm disabled:opacity-50"
          >
            {loading === 'confirm' ? 'Accepting…' : 'Accept request'}
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => act('cancel', 'declined')}
            className="flex-1 rounded-xl border-2 border-rose-400/60 bg-rose-500/10 py-3 text-sm font-bold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
          >
            {loading === 'cancel' ? 'Declining…' : 'Decline'}
          </button>
        </div>
      )}

      {booking.status === 'Confirmed' && (
        <div className="mt-3 flex gap-2">
          {booking.meetingLink && (
            <a
              href={booking.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl bg-indigo-600 py-2 text-center text-xs font-bold text-white transition hover:bg-indigo-700"
            >
              🎥 Join Session
            </a>
          )}
          <button
            disabled={loading !== null}
            onClick={() => onAction('complete_prompt', booking)}
            className="flex-1 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {loading === 'complete' ? '...' : '✓ Complete'}
          </button>
          <a
            href="/chat"
            className="flex-1 rounded-xl border border-indigo-400/50 bg-indigo-500/20 py-2 text-center text-xs font-bold text-indigo-200 transition hover:bg-indigo-500/30"
          >
            💬 Message
          </a>
        </div>
      )}

      {booking.studentNotes && (
        <p className="mt-2 rounded-xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] px-3 py-2 text-[11px] italic text-[var(--mh-text-muted)]">
          Note: {booking.studentNotes}
        </p>
      )}
    </motion.article>
  );
}

export default function TutorDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [activeNoteBooking, setActiveNoteBooking] = useState(null);

  const loadStats = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setIsLoading(true);
    try {
      const [data, tutorProfile, notifData] = await Promise.all([
        fetchTutorDashboardStats(token),
        fetchTutorOnboardingProfile(token).catch(() => null),
        fetchNotifications(token).catch(() => ({ notifications: [], unreadCount: 0 })),
      ]);
      setStats({
        totalBookings: data?.totalBookings ?? data?.TotalBookings ?? 0,
        pendingBookings: data?.pendingBookings ?? data?.PendingBookings ?? 0,
        confirmedBookings: data?.confirmedBookings ?? data?.ConfirmedBookings ?? 0,
        completedBookings: data?.completedBookings ?? data?.CompletedBookings ?? 0,
        cancelledBookings: data?.cancelledBookings ?? data?.CancelledBookings ?? 0,
        totalEarnings: Number(data?.totalEarnings ?? data?.TotalEarnings ?? 0),
        earningsThisMonth: Number(data?.earningsThisMonth ?? data?.EarningsThisMonth ?? 0),
        sessionsThisMonth: data?.sessionsThisMonth ?? data?.SessionsThisMonth ?? 0,
        upcomingBookings: data?.upcomingBookings ?? data?.UpcomingBookings ?? [],
        pendingRequests: data?.pendingRequests ?? data?.PendingRequests ?? [],
      });
      setProfile(tutorProfile);
      setNotifications(notifData?.notifications ?? []);
    } catch (e) {
      toast.error(e.message || 'Failed to load dashboard');
      if (e.message?.toLowerCase().includes('profile not found')) {
        navigate('/tutor-onboarding');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    loadStats(false);
    const interval = setInterval(() => loadStats(true), 30000);
    const onFocus = () => loadStats(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadStats]);

  const handleAction = async (action, bookingParam) => {
    const bookingId = typeof bookingParam === 'object' ? bookingParam.id : bookingParam;

    if (action === 'confirm') await confirmBooking({ token, bookingId });
    else if (action === 'cancel') await cancelBooking({ token, bookingId, reason: 'Declined by tutor' });
    else if (action === 'complete_prompt') {
      setActiveNoteBooking(bookingParam); // Opens the modal
      return; 
    }
    await loadStats(); // refresh
  };

  const submitSessionNote = async (booking, formData) => {
    try {
      // 1. Mark booking complete
      await completeBooking({ token, bookingId: booking.id });
      // 2. Submit session note
      await addSessionNote({ 
        token, 
        payload: {
          bookingId: booking.id,
          studentProfileId: booking.studentProfileId,
          ...formData
        } 
      });
      toast.success('Session completed and report submitted!');
      setActiveNoteBooking(null);
      await loadStats();
    } catch {
      toast.error('Failed to complete session or submit report.');
    }
  };

  const tabBookings = activeTab === 'pending'
    ? stats?.pendingRequests ?? []
    : stats?.upcomingBookings ?? [];

  const profileCompleteness = profile?.profileCompleteness ?? 0;
  const uniqueStudents = new Set(
    [...(stats?.pendingRequests ?? []), ...(stats?.upcomingBookings ?? [])].map((b) => b.studentProfileId),
  ).size;

  const statCards = [
    { label: 'Total Sessions', value: stats?.totalBookings ?? 0, icon: '📚', tone: 'indigo' },
    { label: 'Active Students', value: uniqueStudents, icon: '👥', tone: 'sky' },
    { label: 'Pending Requests', value: stats?.pendingBookings ?? 0, icon: '⏳', tone: 'amber' },
    { label: 'Earnings This Month', value: stats?.earningsThisMonth ?? 0, icon: '💰', tone: 'rose', prefix: '$' },
  ];

  const recentActivity = [
    ...(stats?.pendingRequests ?? []).slice(0, 3).map((b) => ({
      id: `pending-${b.id}`,
      text: `New session request from ${b.studentName}`,
      time: b.bookingDate,
      tone: 'amber',
    })),
    ...(stats?.upcomingBookings ?? []).slice(0, 3).map((b) => ({
      id: `upcoming-${b.id}`,
      text: `Upcoming session with ${b.studentName}`,
      time: b.bookingDate,
      tone: 'indigo',
    })),
    ...notifications.slice(0, 4).map((n) => ({
      id: `notif-${n.id}`,
      text: n.title,
      time: n.createdAtUtc,
      tone: 'violet',
    })),
  ].slice(0, 8);

  return (
    <motion.div className="space-y-4">
      <AdminPriorityBanner token={token} />
      <WarningBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--mh-text)]">My Dashboard</h1>
          <p className="mt-0.5 text-sm text-[var(--mh-text-muted)]">
            Manage your sessions, earnings, and student requests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/tutor/profile')}
          className="mh-btn-secondary rounded-lg px-4 py-2 text-sm font-semibold"
        >
          ✏️ Edit Profile
        </button>
      </div>

      {isLoading ? (
        <PageSkeleton rows={3} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="glass-panel rounded-2xl p-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-base font-bold text-[var(--mh-text)]">Session Requests</h2>
            <div className="flex gap-2">
              {[
                { key: 'pending', label: 'Pending' },
                { key: 'upcoming', label: 'Upcoming' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  type="button"
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    activeTab === key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[var(--mh-bg-elevated)] text-[var(--mh-text-muted)] hover:text-[var(--mh-text)]'
                  }`}
                >
                  {label}
                  {key === 'pending' && stats?.pendingBookings > 0 && (
                    <span className="ml-1.5 rounded-full bg-white/30 px-1.5 text-[10px]">
                      {stats.pendingBookings}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {tabBookings.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-[var(--mh-text-muted)]">
                <span className="text-3xl">📭</span>
                <p className="mt-2 text-sm font-medium">
                  No {activeTab === 'pending' ? 'pending requests' : 'upcoming sessions'}
                </p>
              </div>
            ) : (
              tabBookings.map((b) => (
                <BookingCard key={b.id} booking={b} onAction={handleAction} />
              ))
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="glass-panel rounded-2xl p-4">
            <h2 className="mb-3 font-heading text-base font-bold text-[var(--mh-text)]">This Month</h2>
            <p className="mb-2 text-[10px] text-[var(--mh-text-muted)]">
              Earnings include pending, confirmed, and completed sessions plus course enrollments.
            </p>
            <div className="space-y-2">
              {[
                { label: 'Sessions', value: stats?.sessionsThisMonth ?? 0, icon: '🎯' },
                { label: 'Earnings', value: `$${Number(stats?.earningsThisMonth ?? 0).toLocaleString()}`, icon: '💵' },
                { label: 'Confirmed', value: stats?.confirmedBookings ?? 0, icon: '📅' },
                { label: 'Cancelled', value: stats?.cancelledBookings ?? 0, icon: '❌' },
              ].map(({ label, value, icon }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm text-[var(--mh-text-muted)]">
                    <span>{icon}</span>
                    {label}
                  </div>
                  <p className="font-heading text-sm font-bold text-indigo-500">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Lifetime earnings</p>
              <p className="font-heading text-xl font-bold text-indigo-400">
                ${Number(stats?.totalEarnings ?? 0).toLocaleString()}
              </p>
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-4">
            <h2 className="mb-3 font-heading text-base font-bold text-[var(--mh-text)]">Recent Activity</h2>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-[var(--mh-text-muted)]">No recent activity yet.</p>
              ) : (
                recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 rounded-lg border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] px-3 py-2"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        item.tone === 'amber' ? 'bg-amber-500' : item.tone === 'indigo' ? 'bg-indigo-500' : 'bg-violet-500'
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[var(--mh-text)]">{item.text}</p>
                      {item.time && (
                        <p className="text-[10px] text-[var(--mh-text-muted)]">
                          {new Date(item.time).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {activeNoteBooking && (
          <SessionNoteModal 
            booking={activeNoteBooking} 
            onClose={() => setActiveNoteBooking(null)} 
            onSave={submitSessionNote} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

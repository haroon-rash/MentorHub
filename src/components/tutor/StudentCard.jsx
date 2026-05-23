import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const STATUS_BADGE = {
  Confirmed: 'mh-badge-emerald',
  Completed: 'mh-badge-indigo',
  Pending: 'mh-badge-amber',
  Cancelled: 'mh-badge-rose',
};

export default function StudentCard({ student, onAnnounce, onView }) {
  const getInitials = (name) =>
    String(name || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const statusClass = STATUS_BADGE[student.bookingStatus] || 'mh-badge-indigo';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-4 shadow-sm"
    >
      <div className="mb-4 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
          {getInitials(student.fullName)}
        </div>
      </div>

      <h3 className="mb-2 text-center text-lg font-bold text-[var(--mh-text)]">{student.fullName}</h3>

      <div className="mb-3 flex justify-center">
        <span className="mh-badge-indigo rounded-full px-3 py-1 text-xs font-semibold">{student.subject}</span>
      </div>

      <div className="mb-4 space-y-2 text-sm text-[var(--mh-text-muted)]">
        <p><span className="font-semibold text-[var(--mh-text)]">Fee:</span> ${student.fee}</p>
        <p><span className="font-semibold text-[var(--mh-text)]">Time:</span> {student.timeSlot}</p>
        <p><span className="font-semibold text-[var(--mh-text)]">Last booking:</span> {new Date(student.bookingDate).toLocaleDateString()}</p>
        <p><span className="font-semibold text-[var(--mh-text)]">Sessions:</span> {student.totalSessions ?? 1}</p>
        <div className="flex justify-center pt-1">
          <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass}`}>{student.bookingStatus}</span>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-3">
        <p className="text-xs text-[var(--mh-text-muted)]">
          <span className="font-semibold text-[var(--mh-text)]">Email:</span> {student.email}
        </p>
        {student.phoneNumber && (
          <p className="mt-1 text-xs text-[var(--mh-text-muted)]">
            <span className="font-semibold text-[var(--mh-text)]">Phone:</span> {student.phoneNumber}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAnnounce(student)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <MessageSquare size={16} />
          Announce
        </button>
        <Link
          to="/chat"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] py-2 text-sm font-semibold text-[var(--mh-text)] hover:border-indigo-400/50"
        >
          <Eye size={16} />
          Message
        </Link>
      </div>
    </motion.div>
  );
}

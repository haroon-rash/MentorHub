import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Clock, BookOpen, ClipboardList, AlertCircle, Megaphone } from 'lucide-react';

const TYPE_META = {
  1: { label: 'Announcement', icon: BookOpen },
  2: { label: 'Urgent', icon: AlertCircle },
  3: { label: 'Assignment', icon: ClipboardList },
};

function getTargetBadge(announcement) {
  const label = announcement.targetTypeLabel;
  if (label) {
    const isAll = /all students/i.test(label);
    return { text: isAll ? 'All Students' : `To: ${label}`, isAll };
  }

  const tt = String(announcement.targetType || '').toUpperCase();
  if (tt === 'ALL' || tt === '1') {
    return { text: 'All Students', isAll: true };
  }
  if (announcement.targetStudentName) {
    return { text: `To: ${announcement.targetStudentName}`, isAll: false };
  }
  if (tt.startsWith('STUDENT:') || tt === '2') {
    return { text: 'Specific student', isAll: false };
  }
  return { text: 'All Students', isAll: true };
}

const AnnouncementCard = ({ announcement, onDelete }) => {
  const type = announcement.announcementType ?? 1;
  const meta = TYPE_META[type] || { label: 'Announcement', icon: Megaphone };
  const Icon = meta.icon;
  const bodyText = announcement.announcementText || announcement.content || '';
  const relativeTime = getRelativeTime(announcement.createdAtUtc || announcement.createdAt);
  const target = getTargetBadge(announcement);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2 }}
      className="mb-4 rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-5 shadow-sm transition-all hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-[var(--mh-text)]">{announcement.title || 'Untitled'}</h3>
            <p className="mt-0.5 text-xs text-[var(--mh-text-muted)]">
              {announcement.announcementTypeLabel || meta.label}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(announcement.id)}
          className="shrink-0 rounded-lg p-2 text-rose-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
          title="Delete announcement"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-[var(--mh-text-muted)]">{bodyText}</p>

      <div className="flex items-center justify-between gap-2 text-xs">
        <span
          className={`rounded-full px-2.5 py-1 font-semibold ${
            target.isAll
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-amber-500/15 text-amber-200'
          }`}
        >
          {target.text}
        </span>
        <span className="flex items-center gap-1 text-[var(--mh-text-muted)]">
          <Clock size={14} />
          {relativeTime}
        </span>
      </div>
    </motion.div>
  );
};

function getRelativeTime(dateString) {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default AnnouncementCard;

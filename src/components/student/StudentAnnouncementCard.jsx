import React from 'react';
import { motion } from 'framer-motion';
import { Clock, BookOpen, ClipboardList, AlertCircle } from 'lucide-react';
import { resolvePublicAssetUrl } from '../../utils/urls.js';

const TYPE_META = {
  1: { label: 'Announcement', icon: BookOpen, accent: 'indigo' },
  2: { label: 'Urgent', icon: AlertCircle, accent: 'rose' },
  3: { label: 'Assignment', icon: ClipboardList, accent: 'sky' },
};

function getInitials(name) {
  return String(name || '?')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const StudentAnnouncementCard = ({ announcement, onRead }) => {
  const type = announcement.announcementType ?? 1;
  const meta = TYPE_META[type] || TYPE_META[1];
  const Icon = meta.icon;
  const tutorName = announcement.tutorName?.trim() || 'Your tutor';
  const relativeTime = getRelativeTime(announcement.createdAtUtc || announcement.createdAt);
  const hasDeadline =
    announcement.deadline != null && new Date(announcement.deadline) > new Date();
  const photoUrl = announcement.tutorPhotoUrl
    ? announcement.tutorPhotoUrl.startsWith('http')
      ? announcement.tutorPhotoUrl
      : resolvePublicAssetUrl(announcement.tutorPhotoUrl, 'profiles')
    : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => {
        if (!announcement.isRead && onRead && announcement.id) {
          onRead(announcement.id);
        }
      }}
      className={`group cursor-pointer rounded-2xl border bg-[var(--mh-bg-elevated)] p-5 shadow-sm transition-all hover:shadow-md ${
        announcement.isRead
          ? 'border-[var(--mh-border)] opacity-90'
          : 'border-indigo-500/40 ring-1 ring-indigo-500/20'
      }`}
    >
      <div className="mb-4 flex items-start gap-4">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={tutorName}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-indigo-400/30"
          />
        ) : (
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white"
          >
            {getInitials(tutorName)}
          </motion.div>
        )}

        <motion.div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="mh-badge-indigo rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {meta.label}
            </span>
            {!announcement.isRead && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                New
              </span>
            )}
          </div>
          <h3 className="truncate text-lg font-bold text-[var(--mh-text)]">
            {announcement.title || 'Untitled'}
          </h3>
          <p className="mt-0.5 text-sm text-[var(--mh-text-muted)]">
            From{' '}
            <span className="font-semibold text-indigo-400">{tutorName}</span>
            {announcement.subject ? (
              <>
                {' '}
                · <span className="text-[var(--mh-text-muted)]">{announcement.subject}</span>
              </>
            ) : null}
          </p>
        </motion.div>

        <div className="hidden shrink-0 rounded-xl bg-indigo-500/10 p-2 text-indigo-400 sm:block">
          <Icon size={20} />
        </div>
      </div>

      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-[var(--mh-text-muted)]">
        {announcement.announcementText || announcement.content}
      </p>

      {hasDeadline && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <Clock size={14} className="shrink-0" />
          <span>
            <span className="font-semibold">Due:</span>{' '}
            {new Date(announcement.deadline).toLocaleString()}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[var(--mh-border)] pt-3 text-xs text-[var(--mh-text-muted)]">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {relativeTime}
        </span>
        {announcement.isRead ? (
          <span className="font-medium text-emerald-400">Read</span>
        ) : (
          <span className="font-medium text-indigo-400 group-hover:underline">Mark as read</span>
        )}
      </div>
    </motion.article>
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

export default StudentAnnouncementCard;

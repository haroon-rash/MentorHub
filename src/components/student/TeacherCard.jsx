import React from 'react';
import { motion } from 'framer-motion';
import { Star, Megaphone } from 'lucide-react';
import { resolvePublicAssetUrl } from '../../utils/urls.js';
import UnreadBadge from '../ui/UnreadBadge.jsx';

export default function TeacherCard({ teacher, onSelect, selectedTutor }) {
  const getInitials = (name) =>
    String(name || '?')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const isSelected = selectedTutor?.tutorProfileId === teacher.tutorProfileId;
  const total = teacher.announcementCount ?? 0;
  const unread = teacher.unreadAnnouncementCount ?? 0;
  const photo = teacher.profilePhotoUrl
    ? teacher.profilePhotoUrl.startsWith('http')
      ? teacher.profilePhotoUrl
      : resolvePublicAssetUrl(teacher.profilePhotoUrl, 'profiles')
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => onSelect(teacher)}
      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${
        isSelected
          ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
          : 'border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] hover:border-indigo-400/40'
      }`}
    >
      <div className="relative mb-4 flex justify-center">
        {photo ? (
          <img src={photo} alt={teacher.fullName} className="h-16 w-16 rounded-full object-cover ring-2 ring-indigo-400/30" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
            {getInitials(teacher.fullName)}
          </div>
        )}
        <UnreadBadge count={unread} className="absolute -right-0.5 top-0" />
      </div>

      <h3 className="mb-1 text-center text-lg font-bold text-[var(--mh-text)]">{teacher.fullName}</h3>

      <div className="mb-3 flex justify-center">
        <span className="mh-badge-indigo rounded-full px-3 py-1 text-xs font-semibold">{teacher.subject}</span>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-[var(--mh-text-muted)]">
          <Star size={16} className="fill-amber-400 text-amber-400" />
          <span className="font-semibold text-[var(--mh-text)]">{teacher.averageRating ?? 'N/A'}</span>
        </div>
        <span className="font-bold text-indigo-400">${teacher.hourlyFee}/hr</span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Megaphone size={16} className="shrink-0 text-amber-300" />
          <span className="truncate text-sm font-medium text-amber-100">
            {total} announcement{total === 1 ? '' : 's'}
          </span>
        </div>
        {unread > 0 && <UnreadBadge count={unread} />}
      </div>

      <span
        className={`block w-full rounded-xl py-2 text-center text-sm font-semibold ${
          isSelected ? 'bg-indigo-600 text-white' : 'bg-[var(--mh-input-bg)] text-[var(--mh-text)] border border-[var(--mh-border)]'
        }`}
      >
        {isSelected ? 'Selected ✓' : 'View Announcements'}
      </span>
    </motion.div>
  );
}

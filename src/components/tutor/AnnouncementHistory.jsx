import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AnnouncementCard from './AnnouncementCard';
import { AlertCircle } from 'lucide-react';

const AnnouncementHistory = ({ announcements, onDelete, isLoading }) => {
  const [confirmDelete, setConfirmDelete] = useState(null);

  const groupAnnouncementsByDate = (items) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = { today: [], yesterday: [], earlier: [] };

    items.forEach((announcement) => {
      const rawDate = announcement.createdAtUtc || announcement.createdAt;
      const announcementDate = new Date(rawDate);
      announcementDate.setHours(0, 0, 0, 0);

      if (announcementDate.getTime() === today.getTime()) {
        groups.today.push(announcement);
      } else if (announcementDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(announcement);
      } else {
        groups.earlier.push(announcement);
      }
    });

    return groups;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-32 animate-pulse rounded-2xl bg-[var(--mh-input-bg)]"
          />
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-8 text-center"
      >
        <div className="mb-3 text-4xl">📢</div>
        <h3 className="mb-2 text-lg font-semibold text-[var(--mh-text)]">No Announcements Yet</h3>
        <p className="text-sm text-[var(--mh-text-muted)]">
          Go to the My Students tab and click Announce to send your first announcement.
        </p>
      </motion.div>
    );
  }

  const groups = groupAnnouncementsByDate(announcements);

  const renderGroup = (groupName, groupLabel) => {
    if (groups[groupName].length === 0) return null;

    return (
      <div key={groupName} className="mb-8">
        <motion.h3
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--mh-text)]"
        >
          <span className="text-2xl">
            {groupName === 'today' ? '📅' : groupName === 'yesterday' ? '⏰' : '📂'}
          </span>
          {groupLabel}
        </motion.h3>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {groups[groupName].map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {confirmDelete === announcement.id ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <AlertCircle className="mt-1 text-rose-400" size={20} />
                    <div>
                      <p className="font-semibold text-[var(--mh-text)]">Delete announcement?</p>
                      <p className="mt-1 text-sm text-[var(--mh-text-muted)]">
                        This cannot be undone. Delete &quot;{announcement.title}&quot;?
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="rounded-lg border border-[var(--mh-border)] px-4 py-2 text-sm font-semibold text-[var(--mh-text)] transition-colors hover:bg-[var(--mh-input-bg)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(announcement.id);
                        setConfirmDelete(null);
                      }}
                      className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <AnnouncementCard
                  announcement={announcement}
                  onDelete={() => setConfirmDelete(announcement.id)}
                />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  };

  return (
    <motion.div>
      {renderGroup('today', 'Today')}
      {renderGroup('yesterday', 'Yesterday')}
      {renderGroup('earlier', 'Earlier')}
    </motion.div>
  );
};

export default AnnouncementHistory;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X, ChevronRight } from 'lucide-react';
import { fetchNotifications, markNotificationRead } from '../../services/authApi.js';

const DISMISS_KEY = 'mh.admin.banner.dismissed';

export default function AdminPriorityBanner({ token }) {
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const res = await fetchNotifications(token);
        const list = res?.notifications || res?.data?.notifications || [];
        const adminMsgs = list
          .filter((n) => !n.isRead)
          .filter((n) => {
            const t = String(n.title || '').toLowerCase();
            const m = String(n.message || '').toLowerCase();
            return (
              t.includes('administration') ||
              t.includes('mentorhub') ||
              m.includes('— mentorhub') ||
              n.type === 'General' ||
              n.type === 0
            );
          })
          .slice(0, 3);
        if (active) setItems(adminMsgs);
      } catch {
        if (active) setItems([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const visible = items.filter((n) => !dismissed.has(n.id));

  const dismiss = (id) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
    markNotificationRead(id, token).catch(() => {});
  };

  if (!visible.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="space-y-2"
      >
        {visible.map((n) => (
          <motion.div
            key={n.id}
            className="relative overflow-hidden rounded-2xl border border-violet-500/35 bg-gradient-to-r from-violet-600/20 via-indigo-600/15 to-fuchsia-600/10 p-4 shadow-lg shadow-violet-500/10"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />
            <div className="relative flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/30 text-violet-200">
                <Megaphone size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Administration</p>
                <p className="font-heading text-sm font-bold text-[var(--mh-text)]">{n.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--mh-text-muted)]">{n.message}</p>
                <Link
                  to="/chat"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  Open messages
                  <ChevronRight size={14} />
                </Link>
              </div>
              <button
                type="button"
                onClick={() => dismiss(n.id)}
                className="shrink-0 rounded-lg p-1 text-[var(--mh-text-muted)] hover:bg-white/10 hover:text-[var(--mh-text)]"
                aria-label="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

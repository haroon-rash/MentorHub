import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/authApi.js';

const TYPE_ICON = {
  BookingRequested: '📩',
  BookingConfirmed: '✅',
  BookingCancelled: '❌',
  BookingCompleted: '🎉',
  ReviewReceived: '⭐',
  NewMessage: '💬',
  TutorVerified: '🎓',
  TutorRejected: '⚠️',
  General: '🔔',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell({ connection }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    if (!token) return undefined;

    fetchNotifications(token)
      .then((data) => {
        if (!isMounted) return;
        const payload = data?.data ?? data ?? {};
        setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
        setUnreadCount(typeof payload.unreadCount === 'number' ? payload.unreadCount : 0);
      })
      .catch(() => {
        if (isMounted) toast.error('Failed to load notifications');
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!connection) return undefined;

    const handler = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);
    };

    try {
      connection.on('ReceiveNotification', handler);
    } catch (err) {
      console.warn('Could not attach SignalR notification handler:', err);
    }

    return () => {
      try {
        connection.off('ReceiveNotification', handler);
      } catch {
        /* silent cleanup */
      }
    };
  }, [connection]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id, token);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* silent */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* silent */
    }
  };

  const navigateForNotification = (n) => {
    if (n?.actionPath) {
      navigate(n.actionPath);
      return;
    }
    if (n?.type?.includes('Booking')) {
      navigate('/student-profile');
    } else if (n?.type === 'NewMessage') {
      navigate('/chat');
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.isRead) handleMarkRead(n.id);
    setOpen(false);
    navigateForNotification(n);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-xl p-2 text-[var(--mh-text-muted)] transition hover:bg-indigo-500/10 hover:text-[var(--mh-text)]"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="font-heading text-sm font-black text-slate-900">
                Notifications{' '}
                {unreadCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                    {unreadCount} new
                  </span>
                )}
              </h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-slate-400">
                  <span className="text-3xl">🔔</span>
                  <p className="mt-2 text-xs font-bold">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${
                      !n.isRead ? 'bg-indigo-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0 text-lg">{TYPE_ICON[n.type] ?? '🔔'}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-black ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{n.message}</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400">{timeAgo(n.createdAtUtc)}</p>
                      </div>
                      {!n.isRead && (
                        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

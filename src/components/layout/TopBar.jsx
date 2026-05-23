import React, { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { Link, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { Role } from '../../constants/roles.js';
import { getDashboardPath, getProfilePath, getTopNavItems } from '../../config/navigation.js';
import NotificationBell from '../ui/NotificationBell.jsx';
import UserProfileMenu from './UserProfileMenu.jsx';
import { apiBaseUrl } from '../../utils/urls.js';

const MotionDiv = motion.div;

const navClass = ({ isActive }) =>
  `rounded-xl px-4 py-2 text-sm font-semibold tracking-wide transition whitespace-nowrap xl:px-5 xl:py-2 ${
    isActive
      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
      : 'text-[var(--mh-text)] hover:bg-white/40 dark:hover:bg-white/10'
  }`;

const compactChip =
  'mh-glass-chip inline-flex h-9 min-w-[5.5rem] items-center justify-center rounded-xl px-4 text-sm font-semibold text-[var(--mh-text)] transition hover:border-indigo-400/40';

export default function TopBar() {
  const { isAuthenticated, role, tutorStatus, token, name } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { openMobile } = useSidebar();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationConnection, setNotificationConnection] = useState(null);

  const navItems = getTopNavItems(role, isAuthenticated, tutorStatus);
  const dashboardLink = getDashboardPath(role, tutorStatus);
  const profileLink = getProfilePath(role, tutorStatus);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (notificationConnection) {
        notificationConnection.stop();
        setNotificationConnection(null);
      }
      return undefined;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiBaseUrl()}/chatHub`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    connection.start().then(() => setNotificationConnection(connection)).catch(() => {});

    return () => {
      connection.stop();
    };
  }, [isAuthenticated, token]);

  const showPendingBadge =
    isAuthenticated &&
    String(role || '').toUpperCase() === Role.TUTOR &&
    String(tutorStatus || '').toUpperCase() === 'PENDING';

  return (
    <header className="sticky top-0 z-30 px-4 pt-3 pb-1 sm:px-5 lg:px-6">
      <div className="mh-content-width flex w-full items-center gap-4 sm:gap-5 lg:gap-6">
        {/* Bar 1 — logo, navigation, utilities */}
        <div className="mh-glass-bar mh-glass-bar-main min-w-0 flex-1">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={openMobile}
              className="mh-glass-chip shrink-0 rounded-xl p-2 lg:hidden"
              aria-label="Open sidebar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link
              to="/"
              className="shrink-0 font-heading text-base font-bold leading-none text-[var(--mh-text)] sm:text-lg lg:text-xl"
            >
              Mentor<span className="text-gradient">Hub</span>
            </Link>
          </div>

          <nav className="hidden min-w-0 justify-self-center xl:flex" aria-label="Main navigation">
            <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-3 xl:gap-4 2xl:gap-5">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                  {item.label}
                </NavLink>
              ))}
              {showPendingBadge && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/25 px-3 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                  ⏳ Pending
                </span>
              )}
            </div>
          </nav>

          <div className="flex items-center justify-end gap-2.5 sm:gap-3">
            <span className="mh-glass-divider hidden sm:block" aria-hidden />
            <button
              type="button"
              onClick={toggleTheme}
              className="mh-glass-chip hidden h-9 w-9 items-center justify-center rounded-xl text-sm sm:inline-flex"
              aria-label="Toggle theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <NotificationBell connection={notificationConnection} />
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="mh-glass-chip h-9 rounded-xl px-3 text-xs font-semibold xl:hidden"
            >
              Menu
            </button>
          </div>
        </div>

        {/* Bar 2 — dashboard & profile only */}
        <div className="mh-glass-bar mh-glass-bar-compact">
          <Link to={dashboardLink} className={compactChip}>
            Dashboard
          </Link>
          <span className="mh-glass-divider" aria-hidden />
          <UserProfileMenu barVariant />
        </div>
      </div>

      {mobileNavOpen && (
        <MotionDiv
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mh-glass-bar mh-content-width mt-3 p-4 xl:hidden"
        >
          <nav className="grid gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileNavOpen(false)}
                className={navClass}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--mh-glass-border)] pt-4">
            <button type="button" onClick={toggleTheme} className="mh-glass-chip flex-1 rounded-xl py-2.5 text-sm">
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
            <Link
              to={dashboardLink}
              onClick={() => setMobileNavOpen(false)}
              className="mh-glass-chip flex-1 rounded-xl py-2.5 text-center text-sm font-semibold"
            >
              Dashboard
            </Link>
            <Link
              to={profileLink}
              onClick={() => setMobileNavOpen(false)}
              className="mh-glass-chip flex-1 rounded-xl py-2.5 text-center text-sm font-semibold"
            >
              Profile
            </Link>
          </div>
          {name && (
            <p className="mt-3 text-center text-xs text-[var(--mh-text-muted)]">Signed in as {name}</p>
          )}
        </MotionDiv>
      )}
    </header>
  );
}

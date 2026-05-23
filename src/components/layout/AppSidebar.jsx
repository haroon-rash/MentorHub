import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSidebar } from '../../context/SidebarContext.jsx';
import { getNavItems, getRoleLabel } from '../../config/navigation.js';
import { logout } from '../../services/authApi.js';
import { toast } from 'sonner';
import { resolvePublicAssetUrl } from '../../utils/urls.js';
import { fetchTutorOnboardingProfile, fetchStudentOnboardingProfile } from '../../services/authApi.js';
import { Role } from '../../constants/roles.js';
import { getSessionDisplayEmail, isAdminRole } from '../../utils/authSession.js';
import useAnnouncementUnread from '../../hooks/useAnnouncementUnread.js';
import UnreadBadge from '../ui/UnreadBadge.jsx';

function getFirstName(fullName) {
  return String(fullName || '').trim().split(/\s+/)[0] || 'User';
}

export default function AppSidebar() {
  const navigate = useNavigate();
  const { name, role, tutorStatus, token, refreshToken, clearAuthSession, isAuthenticated, displayEmail, email } = useAuth();
  const { collapsed, mobileOpen, toggleCollapsed, closeMobile } = useSidebar();
  const [photoUrl, setPhotoUrl] = useState('');

  const { totalUnread } = useAnnouncementUnread();
  const navItems = getNavItems(role, isAuthenticated, tutorStatus);
  const roleLabel = getRoleLabel(role, tutorStatus);
  const firstName = getFirstName(name);
  const shownEmail = displayEmail || getSessionDisplayEmail(email, role);
  const showEmailLine = isAdminRole(role) && shownEmail;
  const initials = firstName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        if (String(role || '').toUpperCase() === Role.TUTOR) {
          const p = await fetchTutorOnboardingProfile(token);
          setPhotoUrl(p?.profilePhotoUrl || '');
        } else if (String(role || '').toUpperCase() === Role.STUDENT) {
          const p = await fetchStudentOnboardingProfile(token);
          setPhotoUrl(p?.profilePhotoUrl || '');
        }
      } catch {
        setPhotoUrl('');
      }
    };
    load();
  }, [token, role]);

  const handleLogout = async () => {
    try {
      await logout({ token, refreshToken });
    } catch {
      /* continue */
    } finally {
      clearAuthSession();
      toast.success('Logged out');
      navigate('/auth?mode=login');
    }
  };

  const avatarSrc = photoUrl
    ? (photoUrl.startsWith('http') ? photoUrl : resolvePublicAssetUrl(photoUrl, 'profiles'))
    : null;

  const linkClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
      isActive
        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
        : 'text-[var(--mh-text)] hover:bg-indigo-500/12'
    } ${collapsed ? 'justify-center px-2' : ''}`;

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-2 border-b border-[var(--mh-border)] p-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <span className="font-heading text-lg font-bold text-[var(--mh-text)]">
            Mentor<span className="text-gradient">Hub</span>
          </span>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="rounded-lg border border-[var(--mh-border)] p-2 text-[var(--mh-text)] hover:bg-indigo-500/10"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className={`border-b border-[var(--mh-border)] p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'flex-col' : ''}`}>
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover ring-2 ring-indigo-500/30" />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
              {initials}
            </span>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--mh-text)]">{name || firstName}</p>
              {showEmailLine ? (
                <p className="truncate text-[11px] text-[var(--mh-text-muted)]">{shownEmail}</p>
              ) : null}
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--mh-text-muted)]">{roleLabel}</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3 custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={closeMobile}
            className={linkClass}
            title={collapsed ? item.label : undefined}
          >
            <span className="relative text-lg shrink-0" aria-hidden>
              {item.icon}
              {item.to === '/student/announcements' && totalUnread > 0 && (
                <UnreadBadge count={totalUnread} className="absolute -right-2 -top-2 scale-90" />
              )}
            </span>
            {!collapsed && (
              <span className="flex flex-1 items-center justify-between gap-2">
                <span>{item.label}</span>
                {item.to === '/student/announcements' && totalUnread > 0 && (
                  <UnreadBadge count={totalUnread} />
                )}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--mh-border)] p-3">
        <button
          type="button"
          onClick={handleLogout}
          className={`flex w-full items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm font-bold text-rose-400 transition hover:bg-rose-500/20 ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Logout"
        >
          <span aria-hidden>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen border-r border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] shadow-xl transition-all duration-300 ease-out lg:z-30 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-64'}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

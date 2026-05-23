import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.jsx';
import { getDashboardPath, getProfilePath, getRoleLabel } from '../../config/navigation.js';
import { resolvePublicAssetUrl } from '../../utils/urls.js';
import { fetchTutorOnboardingProfile, fetchStudentOnboardingProfile, logout } from '../../services/authApi.js';
import { Role } from '../../constants/roles.js';
import { getSessionDisplayEmail, isAdminRole } from '../../utils/authSession.js';

function getFirstName(fullName) {
  const part = String(fullName || '').trim().split(/\s+/)[0];
  return part || 'User';
}

export default function UserProfileMenu({ barVariant = false }) {
  const navigate = useNavigate();
  const { name, role, tutorStatus, token, refreshToken, clearAuthSession, displayEmail, email } = useAuth();
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const ref = useRef(null);

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

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    try {
      await logout({ token, refreshToken });
    } catch {
      /* continue local cleanup */
    } finally {
      clearAuthSession();
      toast.success('Logged out successfully');
      navigate('/auth?mode=login');
    }
  };

  const firstName = getFirstName(name);
  const roleLabel = getRoleLabel(role, tutorStatus);
  const shownEmail = displayEmail || getSessionDisplayEmail(email, role);
  const initials = firstName.charAt(0).toUpperCase();
  const avatarSrc = photoUrl
    ? (photoUrl.startsWith('http') ? photoUrl : resolvePublicAssetUrl(photoUrl, 'profiles'))
    : null;

  const avatar = avatarSrc ? (
    <img src={avatarSrc} alt="" className="h-8 w-8 rounded-lg object-cover" />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
      {initials}
    </span>
  );

  const triggerClass = barVariant
    ? 'mh-glass-chip inline-flex h-9 min-w-[5.5rem] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-[var(--mh-text)] transition hover:border-indigo-400/40'
    : 'flex items-center gap-2 rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] px-2 py-1.5 pr-3 transition hover:border-indigo-400/50';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {avatar}
        {barVariant ? (
          <span>Profile</span>
        ) : (
          <>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-bold text-[var(--mh-text)]">{firstName}</span>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--mh-text-muted)]">
                {roleLabel}
              </span>
            </span>
            <svg
              className={`h-4 w-4 text-[var(--mh-text-muted)] transition ${open ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="mh-glass-bar absolute right-0 z-50 mt-2 w-56 overflow-hidden py-1"
        >
          <div className="border-b border-[var(--mh-glass-border)] px-4 py-3">
            <p className="text-sm font-bold text-[var(--mh-text)]">{name || firstName}</p>
            {isAdminRole(role) && shownEmail ? (
              <p className="truncate text-xs text-[var(--mh-text-muted)]">{shownEmail}</p>
            ) : null}
            <p className="text-xs text-[var(--mh-text-muted)]">{roleLabel}</p>
          </div>
          <Link
            to={getProfilePath(role, tutorStatus)}
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm font-semibold text-[var(--mh-text)] hover:bg-indigo-500/10"
            role="menuitem"
          >
            Manage profile
          </Link>
          <Link
            to={getDashboardPath(role, tutorStatus)}
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm font-semibold text-[var(--mh-text)] hover:bg-indigo-500/10"
            role="menuitem"
          >
            Dashboard
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="block w-full border-t border-[var(--mh-glass-border)] px-4 py-2.5 text-left text-sm font-semibold text-rose-500 hover:bg-rose-500/10"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

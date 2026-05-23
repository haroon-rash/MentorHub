import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { lookupAdminUsersByEmail } from '../../services/authApi.js';
import { resolvePublicAssetUrl } from '../../utils/urls.js';

function UserResultCard({ user, onSelect }) {
  const roleTone = user.role === 'Tutor' ? 'mh-badge-indigo' : 'mh-badge-sky';
  return (
    <button
      type="button"
      onClick={() => onSelect(user)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-indigo-500/10"
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)]">
        {user.profilePhotoUrl ? (
          <img
            src={user.profilePhotoUrl.startsWith('http') ? user.profilePhotoUrl : resolvePublicAssetUrl(user.profilePhotoUrl, 'profiles')}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-indigo-300">
            {user.fullName?.charAt(0) || '?'}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--mh-text)]">{user.fullName}</p>
        <p className="truncate text-xs text-[var(--mh-text-muted)]">{user.email}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${roleTone}`}>{user.role}</span>
          {user.tutorVerificationStatus && (
            <span className="mh-badge-amber text-[10px]">{user.tutorVerificationStatus}</span>
          )}
          {user.hasActiveRestriction && <span className="mh-badge-rose text-[10px]">Restricted</span>}
          {user.activeWarningCount > 0 && (
            <span className="mh-badge-amber text-[10px]">{user.activeWarningCount} warn</span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function UserEmailLookup({ token, value, onChange, onSelect, placeholder = 'Search by email or name...' }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const anchorRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    if (!token || !value || value.length < 2) {
      setSuggestions([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await lookupAdminUsersByEmail({ token, email: value });
        setSuggestions(Array.isArray(results) ? results : []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [token, value]);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const update = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, suggestions.length]);

  useEffect(() => {
    const onDoc = (e) => {
      const inAnchor = anchorRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      if (!inAnchor && !inDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const dropdown = open && suggestions.length > 0 && (
    <motion.div
      ref={dropdownRef}
      style={dropdownStyle}
      className="max-h-72 overflow-auto rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] py-2 shadow-2xl ring-1 ring-white/5"
      role="listbox"
      onMouseDown={(e) => e.preventDefault()}
    >
      {suggestions.map((user) => (
        <UserResultCard
          key={user.authUserId || user.id}
          user={user}
          onSelect={(u) => {
            onSelect({
              ...u,
              authUserId: u.authUserId || u.AuthUserId,
              email: u.email || u.Email,
              fullName: u.fullName || u.FullName,
              role: u.role || u.Role,
            });
            setOpen(false);
          }}
        />
      ))}
    </motion.div>
  );

  return (
    <div ref={anchorRef} className="relative">
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--mh-text-muted)]">
        Find user by email
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="mh-input w-full pr-10"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--mh-text-subtle)]">
          {loading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </span>
      </div>
      {typeof document !== 'undefined' && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}


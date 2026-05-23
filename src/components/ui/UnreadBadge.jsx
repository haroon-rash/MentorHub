import React from 'react';

/**
 * WhatsApp-style unread count pill for nav icons and cards.
 */
export default function UnreadBadge({ count, className = '' }) {
  const n = Number(count) || 0;
  if (n <= 0) return null;

  const label = n > 99 ? '99+' : String(n);

  return (
    <span
      className={`inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-[var(--mh-bg-elevated)] ${className}`}
      aria-label={`${n} unread`}
    >
      {label}
    </span>
  );
}

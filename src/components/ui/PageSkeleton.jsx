import React from 'react';

export default function PageSkeleton({ rows = 3, className = '' }) {
  return (
    <div className={`animate-pulse space-y-4 ${className}`}>
      <div className="h-10 w-1/3 rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  );
}

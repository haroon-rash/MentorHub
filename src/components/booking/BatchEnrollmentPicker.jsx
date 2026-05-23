import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BatchEnrollmentPicker({
  batches = [],
  selectedBatchId,
  onSelect,
}) {
  const [filterSubject, setFilterSubject] = useState('');

  const subjects = useMemo(() => {
    const set = new Set(batches.map((b) => b.subject).filter(Boolean));
    return Array.from(set);
  }, [batches]);

  const filtered = useMemo(() => {
    if (!filterSubject) return batches;
    return batches.filter((b) => b.subject === filterSubject);
  }, [batches, filterSubject]);

  if (batches.length === 0) {
    return (
      <motion.div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <p className="text-2xl">📚</p>
        <p className="mt-2 font-bold text-slate-700 dark:text-slate-200">No open course batches</p>
        <p className="mt-1 text-sm text-slate-500">Book a single hourly session instead.</p>
      </motion.div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="space-y-3">
        {subjects.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setFilterSubject('')} className="rounded-lg px-2.5 py-1 text-[11px] font-bold bg-indigo-600 text-white">All</button>
            {subjects.map((s) => (
              <button key={s} type="button" onClick={() => setFilterSubject(s)} className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${filterSubject === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{s}</button>
            ))}
          </div>
        )}
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          No batches match this subject filter. Choose <strong>All</strong> or another subject.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilterSubject('')}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${!filterSubject ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            All
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterSubject(s)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${filterSubject === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((batch) => {
          const selected = selectedBatchId === batch.id;
          const isOnline = batch.isOnline ?? String(batch.sessionMode || '').toLowerCase().includes('online');
          const full = batch.isFull || (batch.seatsAvailable ?? 0) <= 0;

          return (
            <button
              key={batch.id}
              type="button"
              disabled={full}
              onClick={() => onSelect(batch)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                full
                  ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                  : selected
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500 shadow-md dark:bg-indigo-950/40'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">
                    {isOnline ? 'Online' : 'In-person'}
                  </p>
                  <h3 className="mt-0.5 truncate font-heading text-sm font-bold text-slate-900 dark:text-white">{batch.title}</h3>
                  <p className="truncate text-xs font-semibold text-indigo-500">{batch.subject}</p>
                </div>
                <p className="shrink-0 font-heading text-base font-black text-slate-900 dark:text-white">${batch.packageFee}</p>
              </div>

              <div className="mt-2.5 space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[11px] dark:bg-slate-800/60">
                <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                  🕐 {batch.scheduleLabel || `${batch.startTime}–${batch.endTime}`}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  📅 {formatDate(batch.startDateUtc)} → {formatDate(batch.endDateUtc)}
                </p>
                <p className="text-slate-500">
                  {isOnline ? '🎥 Link shared after enrollment' : '📍 Address shared after enrollment'}
                </p>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${full ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>
                  {full ? 'Full' : `${batch.seatsAvailable ?? (batch.maxStudents - batch.enrolledCount)} left`}
                </span>
                <span className="text-[10px] text-slate-500">{batch.enrolledCount}/{batch.maxStudents}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  previewEnrollmentWithdrawal,
  confirmEnrollmentWithdrawal,
} from '../../services/authApi.js';

function isActiveEnrollment(status) {
  const s = String(status || '').toLowerCase();
  return s === 'active' || s === 'pending';
}

export default function EarlyLeaveWizard({ enrollment, token, onDone }) {
  const [open, setOpen] = useState(false);
  const leaveDate = new Date().toISOString().slice(0, 10);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const notesValid = notes.trim().length >= 10;
  const leaveIso = new Date(leaveDate).toISOString();

  const runPreview = async () => {
    if (!notesValid) return null;
    setLoading(true);
    try {
      const result = await previewEnrollmentWithdrawal({
        token,
        enrollmentId: enrollment.id,
        requestedLeaveDateUtc: leaveIso,
        reason: notes.trim(),
      });
      setPreview(result);
      return result;
    } catch (err) {
      toast.error(err.message || 'Could not calculate withdrawal');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!notesValid) {
      toast.error('Withdrawal notes are required (at least 10 characters).');
      return;
    }
    setLoading(true);
    try {
      const latest = preview ?? (await runPreview());
      if (!latest) return;
      await confirmEnrollmentWithdrawal({
        token,
        enrollmentId: enrollment.id,
        requestedLeaveDateUtc: leaveIso,
        reason: notes.trim(),
      });
      toast.success('Course withdrawn. It now appears under Past courses on this page.');
      setOpen(false);
      setPreview(null);
      setNotes('');
      onDone?.();
    } catch (err) {
      toast.error(err.message || 'Could not confirm withdrawal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !notesValid) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(() => { runPreview(); }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notes]);

  if (!isActiveEnrollment(enrollment.status)) return null;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-amber-400 hover:underline">
        Withdraw course…
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="text-sm font-bold text-amber-200">Withdraw course (5-day grace policy)</p>
      <p className="mt-1 text-xs text-[var(--mh-text-muted)]">
        Add your notes only — we calculate what you owe from billing periods automatically (ledger display, no payment in this phase).
      </p>
      <label className="mt-3 block text-xs font-semibold text-[var(--mh-text-muted)]">
        Withdrawal notes <span className="text-rose-400">*</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          minLength={10}
          placeholder="Why are you leaving? What worked or didn’t? (min. 10 characters)"
          className="mt-1 w-full rounded-lg border border-[var(--mh-border)] bg-[var(--mh-bg)] px-3 py-2 text-sm"
        />
      </label>
      <p className="mt-1 text-right text-xs text-[var(--mh-text-muted)]">{notes.trim().length}/10 min</p>

      {loading && !preview && <p className="mt-3 text-xs text-amber-300">Calculating amounts…</p>}

      {preview && (
        <motion.div className="mt-4 rounded-xl border border-[var(--mh-border)] bg-[var(--mh-bg)] p-3 text-sm">
          <p className="font-bold text-[var(--mh-text)]">Calculated amount (display only)</p>
          <p className="mt-2 text-2xl font-black text-amber-300">${Number(preview.totalOwed || 0).toFixed(2)}</p>
          <p className="mt-1 text-xs text-[var(--mh-text-muted)]">
            Effective end: {new Date(preview.effectiveEndDateUtc).toLocaleDateString()}
          </p>
          {preview.periodsWaived?.length > 0 && (
            <p className="mt-2 text-xs text-emerald-400">
              Waived (within 5-day grace): {preview.periodsWaived.length} period(s)
            </p>
          )}
          {preview.periodsOwed?.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-amber-200">
              {preview.periodsOwed.map((p) => (
                <li key={p.id}>
                  Period {p.periodIndex}: ${Number(p.feeAmount).toFixed(2)} (after grace)
                </li>
              ))}
            </ul>
          )}
          {Number(preview.totalOwed) === 0 && (
            <p className="mt-2 text-xs text-emerald-400">No amounts owed under the grace policy.</p>
          )}
        </motion.div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={loading || !notesValid}
          className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {loading ? 'Processing…' : 'Confirm withdrawal'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--mh-text-muted)] hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}

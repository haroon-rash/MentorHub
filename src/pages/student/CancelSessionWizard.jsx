import React, { useState } from 'react';
import { toast } from 'sonner';
import { cancelBooking } from '../../services/authApi.js';

function canCancelBooking(status) {
  const s = String(status || '').toLowerCase();
  return s === 'pending' || s === 'confirmed' || s === 'inprogress';
}

export default function CancelSessionWizard({ booking, token, onDone }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!canCancelBooking(booking?.status)) return null;

  const reasonValid = reason.trim().length >= 5;
  const isInPerson = booking.isInPerson;

  const confirm = async () => {
    if (!reasonValid) {
      toast.error('Please add a short reason (at least 5 characters).');
      return;
    }
    setLoading(true);
    try {
      await cancelBooking({
        token,
        bookingId: booking.id,
        reason: reason.trim(),
      });
      toast.success(isInPerson ? 'In-person session cancelled.' : 'Session cancelled.');
      setOpen(false);
      setReason('');
      onDone?.();
    } catch (err) {
      toast.error(err.message || 'Could not cancel session');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-bold text-amber-400 hover:underline"
      >
        {isInPerson ? 'Cancel in-person session…' : 'Cancel session…'}
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="text-sm font-bold text-amber-200">
        {isInPerson ? 'Cancel in-person session' : 'Cancel session'}
      </p>
      <p className="mt-1 text-xs text-[var(--mh-text-muted)]">
        This withdraws your booking. Your tutor will be notified. You can book again later if needed.
      </p>
      <label className="mt-3 block text-xs font-semibold text-[var(--mh-text-muted)]">
        Reason <span className="text-rose-400">*</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          minLength={5}
          placeholder="Why are you cancelling? (min. 5 characters)"
          className="mt-1 w-full rounded-lg border border-[var(--mh-border)] bg-[var(--mh-bg)] px-3 py-2 text-sm"
        />
      </label>
      <p className="mt-1 text-right text-xs text-[var(--mh-text-muted)]">{reason.trim().length}/5 min</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirm}
          disabled={loading || !reasonValid}
          className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {loading ? 'Cancelling…' : 'Confirm cancellation'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-[var(--mh-text-muted)] hover:underline"
        >
          Keep session
        </button>
      </div>
    </div>
  );
}

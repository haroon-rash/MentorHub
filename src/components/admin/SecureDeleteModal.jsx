import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function SecureDeleteModal({ user, onClose, onConfirm, isSubmitting }) {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim() || !reason.trim()) return;
    onConfirm({ adminPassword: password, reason: reason.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-3xl bg-white p-8 shadow-2xl"
      >
        <h3 className="font-heading text-xl font-bold text-slate-900">Confirm user removal</h3>
        <p className="text-sm text-slate-600">
          You are about to permanently remove <strong>{user?.fullName}</strong> ({user?.email}).
          This requires your admin password and cannot be undone.
        </p>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Deletion reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            placeholder="Document why this account is being removed..."
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Your admin password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !password.trim() || !reason.trim()}
            className="flex-1 rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Removing...' : 'Remove permanently'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

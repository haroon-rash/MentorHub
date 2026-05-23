import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { resolvePublicAssetUrl } from '../../utils/urls.js';
import { reviewWarning } from '../../services/authApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const SEVERITY_TONES = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-amber-100 text-amber-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-rose-100 text-rose-800',
};

const STATUS_TONES = {
  PendingReview: 'bg-amber-100 text-amber-800',
  Active: 'bg-rose-100 text-rose-800',
  Approved: 'bg-emerald-100 text-emerald-800',
  Disapproved: 'bg-slate-200 text-slate-700',
};

function assetHref(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : resolvePublicAssetUrl(url, 'documents');
}

export default function WarningDetailModal({ warning, onClose, onUpdated }) {
  const { token, name } = useAuth();
  const [reviewNotes, setReviewNotes] = useState(warning?.reviewNotes || '');
  const [submitting, setSubmitting] = useState(false);

  if (!warning) return null;

  const severityClass = SEVERITY_TONES[warning.severity] || SEVERITY_TONES.Medium;
  const statusClass = STATUS_TONES[warning.status] || STATUS_TONES.PendingReview;

  const runReview = async (action) => {
    setSubmitting(true);
    try {
      await reviewWarning({
        token,
        id: warning.id,
        payload: {
          action,
          reviewNotes,
          reviewedByAdminName: name || 'Admin',
        },
      });
      toast.success(`Warning ${action.toLowerCase()}d`);
      onUpdated?.();
      onClose();
    } catch (e) {
      toast.error(e.message || 'Review failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl dark:bg-[#14141c]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-600">Account warning</p>
            <h3 className="mt-1 font-heading text-xl font-bold text-slate-900">{warning.category}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${severityClass}`}>
            {warning.severity}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
            {warning.status || (warning.isActive ? 'Active' : 'Closed')}
          </span>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Target user</p>
            <p className="mt-1 font-mono text-slate-700">{warning.targetAuthUserId}</p>
            {warning.targetRole && <p className="text-slate-500">Role: {warning.targetRole}</p>}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Admin notes</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{warning.notes || 'No notes provided.'}</p>
          </div>

          {warning.defenseMessage && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 dark:bg-indigo-950/30">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Tutor defense</p>
              <p className="mt-2 whitespace-pre-wrap text-slate-800">{warning.defenseMessage}</p>
              {warning.defenseSubmittedAtUtc && (
                <p className="mt-2 text-xs text-slate-500">
                  Submitted {new Date(warning.defenseSubmittedAtUtc).toLocaleString()}
                </p>
              )}
              {warning.defenseAttachmentUrl && (
                <a
                  href={assetHref(warning.defenseAttachmentUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm"
                >
                  View defense attachment →
                </a>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Issued</p>
              <p className="mt-1 text-slate-700">{new Date(warning.issuedAtUtc).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Expires</p>
              <p className="mt-1 text-slate-700">
                {warning.expiresAtUtc ? new Date(warning.expiresAtUtc).toLocaleString() : 'No expiry'}
              </p>
            </div>
          </div>

          {warning.issuedByAdminName && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Issued by</p>
              <p className="mt-1 text-slate-700">{warning.issuedByAdminName}</p>
            </div>
          )}

          {warning.attachmentUrl && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Admin evidence</p>
              <a
                href={assetHref(warning.attachmentUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700"
              >
                View attachment →
              </a>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Review notes</p>
            <textarea
              rows={2}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Optional notes for tutor..."
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => runReview('Approve')}
            className="rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => runReview('Disapprove')}
            className="rounded-xl bg-slate-700 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            Disapprove
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => runReview('Activate')}
            className="rounded-xl border border-rose-300 bg-rose-50 py-2.5 text-sm font-bold text-rose-700 disabled:opacity-50"
          >
            Mark active
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => runReview('Pending')}
            className="rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-sm font-bold text-amber-800 disabled:opacity-50"
          >
            Pending review
          </button>
        </div>
      </motion.div>
    </div>
  );
}

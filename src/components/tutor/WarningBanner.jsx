import React, { useEffect, useState } from 'react';
import { fetchMyWarningBanner, fetchMyWarnings, submitWarningDefense, uploadDocument, extractUploadUrl } from '../../services/authApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import FileUpload from '../ui/FileUpload.jsx';
import { toast } from 'sonner';
import { resolvePublicAssetUrl } from '../../utils/urls.js';

const BANNER_STYLES = {
  PendingReview: {
    bar: 'border-amber-400/60 bg-amber-500/15',
    badge: 'bg-amber-500 text-white',
    label: 'Pending review',
  },
  Active: {
    bar: 'border-rose-500/60 bg-rose-500/15',
    badge: 'bg-rose-600 text-white',
    label: 'Active warning',
  },
};

const STATUS_COLORS = {
  PendingReview: 'text-amber-700',
  Active: 'text-rose-700',
  Approved: 'text-emerald-700',
  Disapproved: 'text-slate-600',
};

function assetHref(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : resolvePublicAssetUrl(url, 'documents');
}

function warningId(w) {
  return w?.id ?? w?.Id ?? null;
}

function formatWarningDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export default function WarningBanner() {
  const { token } = useAuth();
  const [banner, setBanner] = useState(null);
  const [history, setHistory] = useState([]);
  const [disapproved, setDisapproved] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [defenseOpen, setDefenseOpen] = useState(false);
  const [defenseForm, setDefenseForm] = useState({ message: '', attachmentUrl: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const [bannerData, all] = await Promise.all([
        fetchMyWarningBanner(token),
        fetchMyWarnings(token),
      ]);
      setBanner(bannerData || null);
      const list = Array.isArray(all) ? all : [];
      setHistory(list);
      setDisapproved(list.filter((w) => w.status === 'Disapproved'));
    } catch {
      setBanner(null);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  if (!banner && disapproved.length === 0 && history.length === 0) return null;

  const style = BANNER_STYLES[banner?.status] || BANNER_STYLES.PendingReview;

  const submitDefense = async () => {
    if (!defenseForm.message.trim()) {
      toast.error('Please explain your defense');
      return;
    }
    setSubmitting(true);
    try {
      const id = warningId(banner);
      if (!id) {
        toast.error('Warning record is invalid. Refresh the page and try again.');
        return;
      }
      await submitWarningDefense({
        token,
        warningId: id,
        message: defenseForm.message,
        attachmentUrl: defenseForm.attachmentUrl,
      });
      toast.success('Defense submitted for admin review');
      setDefenseOpen(false);
      setDefenseForm({ message: '', attachmentUrl: '' });
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to submit defense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {banner && (
        <div className={`rounded-2xl border-2 p-4 sm:p-5 ${style.bar}`} role="alert">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${style.badge}`}>
                {style.label}
              </span>
              <h3 className="mt-2 font-heading text-lg font-bold text-[var(--mh-text)]">
                Account warning: {banner.category || banner.Category || 'Policy notice'}
              </h3>
              <p className="mt-1 text-sm text-[var(--mh-text-muted)]">{banner.notes || banner.Notes}</p>
              <p className="mt-2 text-xs text-[var(--mh-text-subtle)]">
                Severity: {banner.severity || banner.Severity || '—'} · Issued{' '}
                {formatWarningDate(banner.issuedAtUtc || banner.IssuedAtUtc)}
              </p>
              {banner.attachmentUrl && (
                <a
                  href={assetHref(banner.attachmentUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-bold text-indigo-600 hover:underline"
                >
                  View admin attachment →
                </a>
              )}
              {banner.defenseSubmittedAtUtc && (
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  Defense submitted {new Date(banner.defenseSubmittedAtUtc).toLocaleString()}
                </p>
              )}
            </div>
            {!banner.defenseSubmittedAtUtc && (
              <button
                type="button"
                onClick={() => setDefenseOpen(true)}
                className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
              >
                Defend
              </button>
            )}
          </div>
        </div>
      )}

      {defenseOpen && banner && (
        <div className="glass-panel space-y-3 rounded-2xl p-5">
          <h4 className="font-bold text-slate-900">Submit your defense</h4>
          <textarea
            rows={4}
            value={defenseForm.message}
            onChange={(e) => setDefenseForm({ ...defenseForm, message: e.target.value })}
            placeholder="Explain your position with facts..."
            className="input-glow w-full rounded-xl border px-4 py-3 text-sm"
          />
          <FileUpload
            label="Supporting evidence (optional)"
            accept="image/*,.pdf"
            currentUrl={defenseForm.attachmentUrl}
            onUpload={async (file) => {
              const url = extractUploadUrl(await uploadDocument(file, token));
              setDefenseForm((f) => ({ ...f, attachmentUrl: url }));
              return url;
            }}
            onClear={() => setDefenseForm((f) => ({ ...f, attachmentUrl: '' }))}
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setDefenseOpen(false)} className="flex-1 rounded-xl border py-2 text-sm font-semibold">
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={submitDefense}
              className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit defense'}
            </button>
          </div>
        </div>
      )}

      {disapproved.length > 0 && (
        <div className="rounded-2xl border border-slate-300 bg-slate-100/80 p-4 dark:border-slate-600 dark:bg-slate-800/50">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Disapproved notices</h4>
          <ul className="mt-2 space-y-2">
            {disapproved.map((w) => (
              <li key={w.id} className="rounded-xl border border-slate-200 bg-white/80 p-3 text-sm dark:bg-slate-900/50">
                <p className="font-semibold text-slate-800">{w.category}</p>
                <p className="text-slate-600">{w.reviewNotes || 'Admin disapproved this warning.'}</p>
                <button
                  type="button"
                  onClick={() => setSelectedHistory(w)}
                  className="mt-2 text-xs font-bold text-indigo-600"
                >
                  View details →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length > 0 && (
        <details className="glass-panel rounded-2xl p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">
            Warning history ({history.length})
          </summary>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {history.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={() => setSelectedHistory(w)}
                  className="w-full rounded-xl border border-slate-100 p-3 text-left text-xs hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-bold text-slate-800">{w.category}</span>
                    <span className={`font-semibold ${STATUS_COLORS[w.status] || 'text-slate-500'}`}>
                      {w.status}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-500">{formatWarningDate(w.issuedAtUtc || w.IssuedAtUtc)}</p>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {selectedHistory && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onClick={() => setSelectedHistory(null)}>
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-heading text-lg font-bold text-slate-900">{selectedHistory.category}</h4>
            <p className={`mt-1 text-sm font-bold ${STATUS_COLORS[selectedHistory.status]}`}>{selectedHistory.status}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{selectedHistory.notes}</p>
            {selectedHistory.reviewNotes && (
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800">
                <span className="font-bold">Admin review: </span>
                {selectedHistory.reviewNotes}
              </p>
            )}
            {selectedHistory.defenseMessage && (
              <p className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100">
                <span className="font-bold">Your defense: </span>
                {selectedHistory.defenseMessage}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedHistory.attachmentUrl && (
                <a href={assetHref(selectedHistory.attachmentUrl)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600">
                  Admin attachment
                </a>
              )}
              {selectedHistory.defenseAttachmentUrl && (
                <a href={assetHref(selectedHistory.defenseAttachmentUrl)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600">
                  Defense attachment
                </a>
              )}
            </div>
            <button type="button" onClick={() => setSelectedHistory(null)} className="mt-4 w-full rounded-xl border py-2 text-sm font-semibold">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

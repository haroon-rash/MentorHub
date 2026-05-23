import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.jsx';
import UserEmailLookup from '../../components/admin/UserEmailLookup.jsx';
import { resolvePublicAssetUrl } from '../../utils/urls.js';
import {
  applyRestriction,
  fetchModerationStats,
  fetchRestrictions,
  fetchWarnings,
  issueWarning,
  revokeRestriction,
} from '../../services/authApi.js';
import FileUpload from '../../components/ui/FileUpload.jsx';
import { uploadDocument, extractUploadUrl } from '../../services/authApi.js';
import WarningDetailModal from '../../components/admin/WarningDetailModal.jsx';

const WARNING_CATEGORIES = ['Fake degree', 'Misconduct', 'Fraud', 'Spam', 'Policy violation', 'Other'];
const RESTRICTION_TYPES = ['CHAT', 'PROFILE', 'LOGIN', 'FULL_FREEZE'];

export default function ModerationCenter() {
  const { token, name } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState(null);
  const [emailSearch, setEmailSearch] = useState(searchParams.get('email') || '');
  const [stats, setStats] = useState({ activeWarnings: 0, activeRestrictions: 0 });
  const [warnings, setWarnings] = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [warningForm, setWarningForm] = useState({
    targetAuthUserId: '',
    targetRole: 'TUTOR',
    category: WARNING_CATEGORIES[0],
    severity: 'Medium',
    initialStatus: 'Active',
    notes: '',
    attachmentUrl: '',
    expiresAtUtc: '',
  });
  const [restrictionForm, setRestrictionForm] = useState({
    targetAuthUserId: '',
    restrictionType: 'CHAT',
    reason: '',
    expiresAtUtc: '',
  });
  const [selectedWarning, setSelectedWarning] = useState(null);

  const load = async () => {
    if (!token) return;
    try {
      const [statsData, warningData, restrictionData] = await Promise.all([
        fetchModerationStats(token),
        fetchWarnings(token),
        fetchRestrictions(token),
      ]);
      setStats(statsData || { activeWarnings: 0, activeRestrictions: 0 });
      setWarnings(Array.isArray(warningData) ? warningData : []);
      setRestrictions(Array.isArray(restrictionData) ? restrictionData : []);
    } catch (error) {
      toast.error(error.message || 'Failed to load moderation data');
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    const prefill = searchParams.get('email');
    if (prefill) setEmailSearch(prefill);
  }, [searchParams]);

  const applySelectedUser = (user) => {
    const authUserId = user.authUserId || user.AuthUserId;
    const email = user.email || user.Email;
    const fullName = user.fullName || user.FullName;
    const role = user.role || user.Role;
    if (!authUserId) {
      toast.error('Could not resolve user id — try another result');
      return;
    }
    setSelectedUser({ ...user, authUserId, email, fullName, role });
    setEmailSearch(email);
    const normalizedRole = String(role || 'TUTOR').toUpperCase();
    setWarningForm((f) => ({
      ...f,
      targetAuthUserId: authUserId,
      targetRole: normalizedRole === 'STUDENT' ? 'STUDENT' : 'TUTOR',
    }));
    setRestrictionForm((f) => ({ ...f, targetAuthUserId: authUserId }));
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6">
        <h1 className="font-heading text-3xl font-bold text-slate-900">Moderation Center</h1>
        <p className="mt-2 text-sm text-slate-600">Issue warnings, apply restrictions, and track enforcement history.</p>
        <div className="mt-4 flex gap-4">
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Active warnings: {stats.activeWarnings}</div>
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">Active restrictions: {stats.activeRestrictions}</div>
        </div>
      </div>

      <div className="glass-panel overflow-visible rounded-3xl p-6">
        <UserEmailLookup token={token} value={emailSearch} onChange={setEmailSearch} onSelect={applySelectedUser} />
        {selectedUser && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-lg font-bold text-indigo-200">
              {selectedUser.fullName?.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-[var(--mh-text)]">{selectedUser.fullName}</p>
              <p className="text-sm text-[var(--mh-text-muted)]">{selectedUser.email}</p>
              <p className="text-xs text-[var(--mh-text-subtle)]">{selectedUser.role} · ready for moderation actions</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="glass-panel space-y-3 rounded-3xl p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!warningForm.targetAuthUserId && !emailSearch) { toast.error('Select a user by email first'); return; }
            try {
              await issueWarning({
                token,
                payload: {
                  ...warningForm,
                  targetEmail: emailSearch,
                  issuedByAdminName: name || 'Admin',
                  expiresAtUtc: warningForm.expiresAtUtc || null,
                },
              });
              toast.success('Warning issued');
              setWarningForm({ ...warningForm, notes: '', attachmentUrl: '' });
              load();
            } catch (error) {
              toast.error(error.message);
            }
          }}
        >
          <h2 className="font-bold text-slate-900">Issue warning</h2>
          <input type="hidden" value={warningForm.targetAuthUserId} readOnly />
          <select className="w-full rounded-xl border px-3 py-2 text-sm" value={warningForm.category} onChange={(e) => setWarningForm({ ...warningForm, category: e.target.value })}>
            {WARNING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="w-full rounded-xl border px-3 py-2 text-sm" value={warningForm.severity} onChange={(e) => setWarningForm({ ...warningForm, severity: e.target.value })}>
            {['Low', 'Medium', 'High', 'Critical'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={warningForm.initialStatus}
            onChange={(e) => setWarningForm({ ...warningForm, initialStatus: e.target.value })}
          >
            <option value="Active">Active (red banner)</option>
            <option value="PendingReview">Pending review (yellow banner)</option>
          </select>
          <textarea className="w-full rounded-xl border px-3 py-2 text-sm" rows={3} placeholder="Notes" value={warningForm.notes} onChange={(e) => setWarningForm({ ...warningForm, notes: e.target.value })} />
          <FileUpload
            label="Evidence attachment"
            accept="image/*,.pdf"
            currentUrl={warningForm.attachmentUrl}
            onUpload={async (file) => {
              const url = extractUploadUrl(await uploadDocument(file, token));
              setWarningForm((f) => ({ ...f, attachmentUrl: url }));
              return url;
            }}
            onClear={() => setWarningForm({ ...warningForm, attachmentUrl: '' })}
          />
          <button type="submit" className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white">Issue warning</button>
        </form>

        <form
          className="glass-panel space-y-3 rounded-3xl p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!restrictionForm.targetAuthUserId && !emailSearch) {
              toast.error('Select a user by email first');
              return;
            }
            try {
              await applyRestriction({
                token,
                payload: {
                  ...restrictionForm,
                  targetEmail: emailSearch,
                  expiresAtUtc: restrictionForm.expiresAtUtc || null,
                },
              });
              toast.success('Restriction applied');
              setRestrictionForm({ ...restrictionForm, reason: '' });
              load();
            } catch (error) {
              toast.error(error.message);
            }
          }}
        >
          <h2 className="font-bold text-slate-900">Apply restriction</h2>
          <input type="hidden" value={restrictionForm.targetAuthUserId} readOnly />
          <select className="w-full rounded-xl border px-3 py-2 text-sm" value={restrictionForm.restrictionType} onChange={(e) => setRestrictionForm({ ...restrictionForm, restrictionType: e.target.value })}>
            {RESTRICTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <textarea className="w-full rounded-xl border px-3 py-2 text-sm" rows={3} placeholder="Reason" value={restrictionForm.reason} onChange={(e) => setRestrictionForm({ ...restrictionForm, reason: e.target.value })} />
          <button type="submit" className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white">Apply restriction</button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-3 font-bold">Recent warnings</h3>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {warnings.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWarning(w)}
                className="w-full rounded-xl border border-slate-100 p-3 text-left text-sm transition hover:border-amber-300 hover:bg-amber-50/50"
              >
                <p className="font-semibold">{w.category} · {w.severity}</p>
                <p className="text-[10px] font-bold uppercase text-indigo-600">{w.status || (w.isActive ? 'Active' : 'Closed')}</p>
                <p className="text-slate-600">{w.targetAuthUserId}</p>
                <p className="line-clamp-2 text-xs text-slate-500">{w.notes}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-amber-600">View details →</p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-3 font-bold">Active restrictions</h3>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {restrictions.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3 text-sm">
                <div>
                  <p className="font-semibold">{r.restrictionType}</p>
                  <p className="text-slate-600">{r.targetAuthUserId}</p>
                  <p className="text-xs text-slate-500">{r.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await revokeRestriction({ token, id: r.id });
                      toast.success('Restriction revoked');
                      load();
                    } catch (error) {
                      toast.error(error.message);
                    }
                  }}
                  className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedWarning && (
        <WarningDetailModal
          warning={selectedWarning}
          onClose={() => setSelectedWarning(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}

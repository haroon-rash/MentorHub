import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchAdminCommunications, sendAdminCommunication } from '../../services/authApi.js';
import UserEmailLookup from '../../components/admin/UserEmailLookup.jsx';
import FileUpload from '../../components/ui/FileUpload.jsx';
import { uploadDocument, extractUploadUrl } from '../../services/authApi.js';

const AUDIENCE_OPTIONS = [
  { value: 'ALL', label: 'All users' },
  { value: 'STUDENTS', label: 'All students' },
  { value: 'TUTORS', label: 'All tutors' },
  { value: 'CUSTOM', label: 'Custom email list' },
];

export default function AdminCommunications() {
  const { token, name } = useAuth();
  const [history, setHistory] = useState([]);
  const [emailSearch, setEmailSearch] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [form, setForm] = useState({
    subject: '',
    body: '',
    audience: 'ALL',
    attachmentUrl: '',
  });

  const load = async () => {
    if (!token) return;
    try {
      const data = await fetchAdminCommunications(token);
      const list = Array.isArray(data)
        ? data
        : data?.items ?? data?.data ?? data?.communications ?? [];
      setHistory(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error(error.message || 'Failed to load communications');
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const addRecipient = (user) => {
    const id = user.authUserId || user.id;
    if (!id || selectedRecipients.some((r) => r.authUserId === id)) return;
    setSelectedRecipients((prev) => [...prev, { authUserId: id, email: user.email, fullName: user.fullName }]);
    setEmailSearch('');
  };

  const removeRecipient = (authUserId) => {
    setSelectedRecipients((prev) => prev.filter((r) => r.authUserId !== authUserId));
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6">
        <h1 className="font-heading text-3xl font-bold text-[var(--mh-text)]">Communication Center</h1>
        <p className="mt-2 text-sm text-[var(--mh-text-muted)]">
          Send announcements to all users, role groups, or hand-picked email addresses. Recipients receive in-app notifications.
        </p>
      </div>

      <form
        className="glass-panel space-y-4 rounded-3xl p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (form.audience === 'CUSTOM' && selectedRecipients.length === 0) {
            toast.error('Add at least one recipient');
            return;
          }
          try {
            const payload = {
              subject: form.subject,
              body: form.body,
              audience: form.audience === 'CUSTOM' ? 'CUSTOM' : form.audience,
              targetEmails: form.audience === 'CUSTOM' ? selectedRecipients.map((r) => r.email) : undefined,
              targetAuthUserIds: form.audience === 'CUSTOM' ? selectedRecipients.map((r) => r.authUserId) : undefined,
              attachmentUrl: form.attachmentUrl || undefined,
              sentByAdminName: name || 'Admin',
            };
            const result = await sendAdminCommunication({ token, payload });
            const count = result?.recipientCount ?? result?.data?.recipientCount ?? 0;
            toast.success(`Sent to ${count} user(s)`);
            setForm({ subject: '', body: '', audience: 'ALL', attachmentUrl: '' });
            setSelectedRecipients([]);
            load();
          } catch (error) {
            toast.error(error.message);
          }
        }}
      >
        <input
          className="input-glow w-full rounded-xl border px-4 py-2.5 text-sm"
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          required
        />
        <textarea
          className="input-glow w-full rounded-xl border px-4 py-2.5 text-sm"
          rows={6}
          placeholder="Message body"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          required
        />

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-[var(--mh-text-muted)]">Recipients</label>
          <select
            className="input-glow w-full rounded-xl border px-4 py-2.5 text-sm"
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value })}
          >
            {AUDIENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {form.audience === 'CUSTOM' && (
          <div className="space-y-3 rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-4">
            <UserEmailLookup
              token={token}
              value={emailSearch}
              onChange={setEmailSearch}
              onSelect={addRecipient}
              placeholder="Search by name or email to add recipient..."
            />
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedRecipients.map((r) => (
                  <span
                    key={r.authUserId}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200"
                  >
                    {r.fullName || r.email}
                    <button type="button" onClick={() => removeRecipient(r.authUserId)} className="text-indigo-300 hover:text-rose-400">×</button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-[var(--mh-text-muted)]">{selectedRecipients.length} recipient(s) selected</p>
          </div>
        )}

        <FileUpload
          label="Attachment (optional)"
          accept="image/*,.pdf,.doc,.docx"
          currentUrl={form.attachmentUrl}
          onUpload={async (file) => {
            const url = extractUploadUrl(await uploadDocument(file, token));
            setForm((f) => ({ ...f, attachmentUrl: url }));
            return url;
          }}
          onClear={() => setForm((f) => ({ ...f, attachmentUrl: '' }))}
        />

        <button type="submit" className="glow-button w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white">
          Send message
        </button>
      </form>

      <div className="glass-panel rounded-3xl p-6">
        <h2 className="mb-4 font-bold text-[var(--mh-text)]">Delivery history</h2>
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-[var(--mh-text-muted)]">No messages sent yet.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-4">
                <p className="font-semibold text-[var(--mh-text)]">{item.subject}</p>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--mh-text-muted)]">{item.body}</p>
                <p className="mt-2 text-xs text-[var(--mh-text-subtle)]">
                  {item.audience} · {item.recipientCount} recipients · {new Date(item.sentAtUtc).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import MultiFileUpload from '../lms/MultiFileUpload.jsx';
import {
  createStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial,
} from '../../services/authApi.js';
import { normalizeStudyMaterial } from '../../utils/apiData.js';
import { resolvePublicAssetUrl } from '../../utils/urls.js';

const emptyForm = {
  tutorBatchId: '',
  subject: '',
  title: '',
  description: '',
  topic: '',
  module: '',
  chapter: '',
  tagsCsv: '',
  fileUrlsCsv: '',
};

function fileListFromCsv(csv) {
  return String(csv || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

export default function TutorStudyMaterialsPanel({
  token,
  batches = [],
  materials = [],
  tutorSubjects = [],
  onRefresh,
  onUpload,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [detailMaterial, setDetailMaterial] = useState(null);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [search, setSearch] = useState('');

  const normalizedMaterials = useMemo(
    () => materials.map(normalizeStudyMaterial).filter(Boolean),
    [materials],
  );

  const subjectGroups = useMemo(() => {
    const map = new Map();
    for (const m of normalizedMaterials) {
      const key = m.subject || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return Array.from(map.entries())
      .map(([subject, items]) => ({
        subject,
        items: items.filter((m) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return (
            m.title.toLowerCase().includes(q) ||
            m.description?.toLowerCase().includes(q) ||
            m.topic?.toLowerCase().includes(q) ||
            m.batchTitle?.toLowerCase().includes(q) ||
            m.tagsCsv?.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }, [normalizedMaterials, search]);

  const batchLocked = Boolean(form.tutorBatchId);
  const lockedSubject = batchLocked
    ? batches.find((b) => b.id === form.tutorBatchId)?.subject || form.subject
    : '';

  const handleBatchChange = (batchId) => {
    const batch = batches.find((b) => b.id === batchId);
    setForm((p) => ({
      ...p,
      tutorBatchId: batchId,
      subject: batch?.subject || p.subject,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setForm({
      tutorBatchId: m.tutorBatchId || '',
      subject: m.subject || '',
      title: m.title || '',
      description: m.description || '',
      topic: m.topic || '',
      module: m.module || '',
      chapter: m.chapter || '',
      tagsCsv: m.tagsCsv || '',
      fileUrlsCsv: m.fileUrlsCsv || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDuplicate = async (m) => {
    if (!token) return;
    setSaving(true);
    try {
      await createStudyMaterial({
        token,
        payload: {
          tutorBatchId: m.tutorBatchId || null,
          subject: m.subject,
          title: `${m.title} (copy)`,
          description: m.description,
          topic: m.topic,
          module: m.module,
          chapter: m.chapter,
          tagsCsv: m.tagsCsv,
          fileUrlsCsv: m.fileUrlsCsv,
        },
      });
      toast.success('Material duplicated.');
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Could not duplicate');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!form.subject?.trim()) {
      toast.error('Subject is required.');
      return;
    }
    if (!form.title?.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (!form.fileUrlsCsv?.trim()) {
      toast.error('Upload at least one file.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        subject: batchLocked ? lockedSubject : form.subject,
        tutorBatchId: form.tutorBatchId || null,
      };
      if (editingId) {
        await updateStudyMaterial({ token, materialId: editingId, payload });
        toast.success('Material updated.');
      } else {
        await createStudyMaterial({ token, payload });
        toast.success('Material published.');
      }
      resetForm();
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!token || !window.confirm('Remove this study material?')) return;
    try {
      await deleteStudyMaterial({ token, materialId: id });
      toast.success('Removed');
      if (detailMaterial?.id === id) setDetailMaterial(null);
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Could not remove');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="glass-panel space-y-4 rounded-3xl border border-indigo-500/20 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl font-bold text-[var(--mh-text)]">
              {editingId ? 'Edit study material' : 'Upload study material'}
            </h2>
            <p className="mt-1 text-sm text-[var(--mh-text-muted)]">
              Organize by subject and batch. Students enrolled in the batch can access files.
            </p>
          </div>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-sm font-bold text-indigo-400 hover:underline">
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--mh-text-muted)]">Course batch</span>
            <select
              className="mh-field w-full"
              value={form.tutorBatchId}
              onChange={(e) => handleBatchChange(e.target.value)}
            >
              <option value="">General (all enrolled students in subject)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.title} — {b.subject}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--mh-text-muted)]">Subject *</span>
            {batchLocked ? (
              <div className="mh-field flex items-center justify-between bg-indigo-500/10 font-semibold text-indigo-300">
                <span>{lockedSubject}</span>
                <span className="text-[10px] font-bold uppercase text-indigo-400">Locked to batch</span>
              </div>
            ) : (
              <select
                className="mh-field w-full"
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                required
              >
                <option value="">Select subject *</option>
                {tutorSubjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </label>
        </div>

        <input
          className="mh-field w-full"
          placeholder="Title *"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          required
        />
        <textarea
          className="mh-field w-full"
          rows={2}
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="mh-field" placeholder="Topic" value={form.topic} onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))} />
          <input className="mh-field" placeholder="Module" value={form.module} onChange={(e) => setForm((p) => ({ ...p, module: e.target.value }))} />
          <input className="mh-field" placeholder="Chapter" value={form.chapter} onChange={(e) => setForm((p) => ({ ...p, chapter: e.target.value }))} />
        </div>
        <input
          className="mh-field w-full"
          placeholder="Tags (comma-separated)"
          value={form.tagsCsv}
          onChange={(e) => setForm((p) => ({ ...p, tagsCsv: e.target.value }))}
        />
        <MultiFileUpload
          label="Files *"
          fileUrlsCsv={form.fileUrlsCsv}
          onChange={(v) => setForm((p) => ({ ...p, fileUrlsCsv: v }))}
          onUpload={onUpload}
        />
        <button type="submit" disabled={saving} className="mh-btn-primary w-full py-3 disabled:opacity-50">
          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Publish material'}
        </button>
      </form>

      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold text-[var(--mh-text)]">Material library</h2>
            <p className="text-sm text-[var(--mh-text-muted)]">{normalizedMaterials.length} items · grouped by subject</p>
          </div>
          <input
            className="mh-field max-w-xs"
            placeholder="Search materials…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {subjectGroups.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-[var(--mh-border)] py-12 text-center text-sm text-[var(--mh-text-muted)]">
            No study materials yet. Upload your first resource above.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {subjectGroups.map(({ subject, items }) => {
              const open = expandedSubject === subject || expandedSubject === null;
              return (
                <section key={subject} className="overflow-hidden rounded-2xl border border-[var(--mh-border)]">
                  <button
                    type="button"
                    onClick={() => setExpandedSubject(expandedSubject === subject ? null : subject)}
                    className="flex w-full items-center justify-between bg-[var(--mh-bg-elevated)] px-4 py-3 text-left"
                  >
                    <span className="font-heading font-bold text-[var(--mh-text)]">{subject}</span>
                    <span className="text-xs font-bold text-indigo-400">{items.length} material{items.length !== 1 ? 's' : ''} {open ? '▾' : '▸'}</span>
                  </button>
                  {open && (
                    <div className="grid gap-3 p-4 sm:grid-cols-2">
                      {items.map((m) => {
                        const files = fileListFromCsv(m.fileUrlsCsv);
                        return (
                          <article
                            key={m.id}
                            className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg)]/50 p-4 transition hover:border-indigo-500/40"
                          >
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                              {m.batchTitle || 'All batches'}
                            </p>
                            <h3 className="mt-1 font-bold text-[var(--mh-text)]">{m.title}</h3>
                            <p className="mt-1 text-xs text-[var(--mh-text-muted)] line-clamp-2">
                              {[m.topic, m.module, m.chapter].filter(Boolean).join(' · ') || m.description || '—'}
                            </p>
                            <p className="mt-2 text-[10px] text-[var(--mh-text-subtle)]">
                              {files.length} file{files.length !== 1 ? 's' : ''} · {m.createdAtUtc ? new Date(m.createdAtUtc).toLocaleDateString() : ''}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" onClick={() => setDetailMaterial(m)} className="rounded-lg bg-indigo-600/20 px-2.5 py-1 text-[10px] font-bold text-indigo-300">
                                Details
                              </button>
                              <button type="button" onClick={() => startEdit(m)} className="rounded-lg bg-violet-600/20 px-2.5 py-1 text-[10px] font-bold text-violet-300">
                                Edit
                              </button>
                              <button type="button" onClick={() => handleDuplicate(m)} className="rounded-lg bg-amber-600/20 px-2.5 py-1 text-[10px] font-bold text-amber-300">
                                Duplicate
                              </button>
                              <button type="button" onClick={() => handleDelete(m.id)} className="rounded-lg bg-rose-600/20 px-2.5 py-1 text-[10px] font-bold text-rose-300">
                                Remove
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {detailMaterial && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setDetailMaterial(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{detailMaterial.subject}</p>
            <h3 className="mt-1 font-heading text-2xl font-bold">{detailMaterial.title}</h3>
            {detailMaterial.batchTitle && (
              <p className="text-sm text-indigo-400">Batch: {detailMaterial.batchTitle}</p>
            )}
            {detailMaterial.description && (
              <p className="mt-3 text-sm text-[var(--mh-text-muted)]">{detailMaterial.description}</p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {detailMaterial.topic && <><dt className="text-[var(--mh-text-subtle)]">Topic</dt><dd className="font-semibold">{detailMaterial.topic}</dd></>}
              {detailMaterial.module && <><dt className="text-[var(--mh-text-subtle)]">Module</dt><dd className="font-semibold">{detailMaterial.module}</dd></>}
              {detailMaterial.chapter && <><dt className="text-[var(--mh-text-subtle)]">Chapter</dt><dd className="font-semibold">{detailMaterial.chapter}</dd></>}
              {detailMaterial.tagsCsv && <><dt className="text-[var(--mh-text-subtle)]">Tags</dt><dd className="font-semibold">{detailMaterial.tagsCsv}</dd></>}
            </dl>
            <h4 className="mt-5 text-xs font-black uppercase tracking-widest text-[var(--mh-text-muted)]">Files</h4>
            <ul className="mt-2 space-y-2">
              {fileListFromCsv(detailMaterial.fileUrlsCsv).map((url, i) => (
                <li key={url}>
                  <a
                    href={resolvePublicAssetUrl(url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-indigo-600/15 px-3 py-2 text-sm font-bold text-indigo-300 hover:bg-indigo-600/25"
                  >
                    <span>📎</span>
                    <span className="truncate">File {i + 1}</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => { startEdit(detailMaterial); setDetailMaterial(null); }} className="mh-btn-primary flex-1 py-2.5 text-sm">
                Edit
              </button>
              <button type="button" onClick={() => setDetailMaterial(null)} className="flex-1 rounded-2xl border border-[var(--mh-border)] py-2.5 text-sm font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

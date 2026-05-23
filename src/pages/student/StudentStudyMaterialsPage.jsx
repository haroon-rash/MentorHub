import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.jsx';
import PageSkeleton from '../../components/ui/PageSkeleton.jsx';
import { fetchStudyMaterialsForStudent } from '../../services/authApi.js';
import { normalizeStudyMaterial, unwrapApiList } from '../../utils/apiData.js';
import { resolvePublicAssetUrl } from '../../utils/urls.js';

function fileListFromCsv(csv) {
  return String(csv || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

export default function StudentStudyMaterialsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [detailMaterial, setDetailMaterial] = useState(null);
  const [expandedSubject, setExpandedSubject] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await fetchStudyMaterialsForStudent(token);
      setMaterials(unwrapApiList(list).map(normalizeStudyMaterial).filter(Boolean));
    } catch {
      toast.error('Could not load study materials.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const subjects = useMemo(() => [...new Set(materials.map((m) => m.subject).filter(Boolean))].sort(), [materials]);

  const subjectGroups = useMemo(() => {
    let list = materials;
    if (subjectFilter) list = list.filter((m) => m.subject === subjectFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.tagsCsv?.toLowerCase().includes(q) ||
        m.batchTitle?.toLowerCase().includes(q));
    }
    const map = new Map();
    for (const m of list) {
      const key = m.subject || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return Array.from(map.entries())
      .map(([subject, items]) => ({ subject, items }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }, [materials, search, subjectFilter]);

  if (loading) return <PageSkeleton rows={5} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="glass-panel rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-indigo-500">Resources</p>
        <h1 className="mt-1 font-heading text-3xl font-black text-[var(--mh-text)]">Study Materials</h1>
        <p className="mt-2 text-sm text-[var(--mh-text-muted)]">
          Materials from your enrolled subjects and batches — organized by subject.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input className="mh-field max-w-xs flex-1" placeholder="Search materials…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="mh-field max-w-[180px]" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {subjectGroups.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-[var(--mh-text-muted)]">
          No study materials available for your enrollments yet.
        </div>
      ) : (
        <div className="space-y-4">
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
                  <span className="text-xs font-bold text-indigo-400">{items.length} resource{items.length !== 1 ? 's' : ''} {open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    {items.map((m) => {
                      const files = fileListFromCsv(m.fileUrlsCsv);
                      return (
                        <article key={m.id} className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg)]/50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{m.batchTitle || 'Course-wide'}</p>
                          <h3 className="mt-1 font-bold text-[var(--mh-text)]">{m.title}</h3>
                          <p className="mt-1 text-xs text-[var(--mh-text-muted)] line-clamp-2">
                            {[m.topic, m.module, m.chapter].filter(Boolean).join(' · ') || m.description || '—'}
                          </p>
                          <p className="mt-2 text-[10px] text-[var(--mh-text-subtle)]">
                            {files.length} file{files.length !== 1 ? 's' : ''} · {m.tutorName} · {m.createdAtUtc ? new Date(m.createdAtUtc).toLocaleDateString() : ''}
                          </p>
                          <button
                            type="button"
                            onClick={() => setDetailMaterial(m)}
                            className="mt-3 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-bold text-indigo-300"
                          >
                            View files & details
                          </button>
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

      {detailMaterial && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setDetailMaterial(null)}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{detailMaterial.subject}</p>
            <h3 className="mt-1 font-heading text-2xl font-bold">{detailMaterial.title}</h3>
            {detailMaterial.batchTitle && <p className="text-sm text-indigo-400">Batch: {detailMaterial.batchTitle}</p>}
            {detailMaterial.description && <p className="mt-3 text-sm text-[var(--mh-text-muted)]">{detailMaterial.description}</p>}
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
                    <span>File {i + 1} — download</span>
                  </a>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setDetailMaterial(null)} className="mt-6 w-full rounded-2xl border border-[var(--mh-border)] py-2.5 text-sm font-bold">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

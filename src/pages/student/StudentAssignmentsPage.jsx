import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.jsx';
import PageSkeleton from '../../components/ui/PageSkeleton.jsx';
import MultiFileUpload from '../../components/lms/MultiFileUpload.jsx';
import {
  fetchCourseAssignmentsForStudent,
  submitCourseAssignment,
  uploadDocument,
  extractUploadUrl,
} from '../../services/authApi.js';

function SubmitModal({ assignment, onClose, onSubmit, submitting, token }) {
  const [text, setText] = useState(assignment.submissionText || '');
  const [fileUrls, setFileUrls] = useState(assignment.submittedFileUrlsCsv || '');

  const uploadFile = async (file) => {
    const res = await uploadDocument(file, token);
    return extractUploadUrl(res);
  };

  const locked = assignment.isOverdue && !assignment.allowLateSubmission;
  const hasExisting = Boolean(assignment.submissionStatus);
  const isGraded = assignment.submissionStatus === 'Graded' || assignment.submissionStatus === 'Rejected';
  const canResubmit =
    !isGraded
    && (!hasExisting
      || assignment.submissionStatus === 'Returned'
      || (assignment.allowResubmission && assignment.submissionStatus === 'Submitted'));
  const readOnly = hasExisting && !canResubmit;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading text-xl font-bold text-[var(--mh-text)]">
          {isGraded ? 'View graded submission' : hasExisting && canResubmit ? 'Update submission' : hasExisting ? 'View submission' : 'Submit'}: {assignment.title}
        </h3>
        <p className="mt-1 text-sm text-[var(--mh-text-muted)]">{assignment.instructions}</p>
        {assignment.attachmentUrlsCsv && (
          <div className="mt-3 rounded-xl bg-indigo-500/10 p-3 text-xs">
            <p className="font-bold text-indigo-300">Reference materials:</p>
            {assignment.attachmentUrlsCsv.split(',').map((u) => u.trim()).filter(Boolean).map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-indigo-400 hover:underline">📎 {url.split('/').pop()}</a>
            ))}
          </div>
        )}
        {isGraded ? (
          <p className="mt-4 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300">This assignment has been graded. Resubmission is not allowed.</p>
        ) : readOnly ? (
          <p className="mt-4 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-300">Resubmission is not allowed for this assignment.</p>
        ) : locked ? (
          <p className="mt-4 rounded-xl bg-rose-500/10 p-4 text-sm text-rose-300">Submission locked — deadline passed.</p>
        ) : (
          <>
            <textarea className="mh-field mt-4 min-h-[100px]" placeholder="Comments / description" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="mt-3">
              <MultiFileUpload label="Your files *" fileUrlsCsv={fileUrls} onChange={setFileUrls} onUpload={uploadFile} />
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-[var(--mh-border)] py-3 text-sm font-bold">Cancel</button>
              <button type="button" disabled={submitting || (!fileUrls && !text)} onClick={() => onSubmit({ submissionText: text, fileUrlsCsv: fileUrls })} className="mh-btn-primary flex-1 py-3 disabled:opacity-50">
                {submitting ? 'Submitting…' : hasExisting ? 'Update submission' : 'Submit work'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = 'indigo' }) {
  const colors = {
    indigo: 'from-indigo-600/20 to-violet-600/10 border-indigo-500/30',
    emerald: 'from-emerald-600/20 to-teal-600/10 border-emerald-500/30',
    amber: 'from-amber-600/20 to-orange-600/10 border-amber-500/30',
    rose: 'from-rose-600/20 to-pink-600/10 border-rose-500/30',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${colors[tone]}`}>
      <p className="text-2xl font-black text-[var(--mh-text)]">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--mh-text-muted)]">{label}</p>
    </div>
  );
}

export default function StudentAssignmentsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('dueDate');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await fetchCourseAssignmentsForStudent(token);
      setAssignments(Array.isArray(list) ? list : []);
    } catch {
      toast.error('Could not load assignments.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((a) => ['Submitted', 'Graded', 'Returned'].includes(a.submissionStatus)).length;
    const pending = assignments.filter((a) => !a.submissionStatus).length;
    const overdue = assignments.filter((a) => a.isOverdue && !a.submissionStatus).length;
    const graded = assignments.filter((a) => a.submissionStatus === 'Graded').length;
    return { total, completed, pending, overdue, graded };
  }, [assignments]);

  const filtered = useMemo(() => {
    let list = [...assignments];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.subject.toLowerCase().includes(q));
    }
    if (filter === 'pending') list = list.filter((a) => !a.submissionStatus);
    if (filter === 'overdue') list = list.filter((a) => a.isOverdue && !a.submissionStatus);
    if (filter === 'graded') list = list.filter((a) => a.submissionStatus === 'Graded');
    if (filter === 'completed') list = list.filter((a) => ['Submitted', 'Graded'].includes(a.submissionStatus));

    const sorters = {
      dueDate: (a, b) => new Date(a.dueDateUtc) - new Date(b.dueDateUtc),
      subject: (a, b) => a.subject.localeCompare(b.subject),
      status: (a, b) => (a.submissionStatus || 'Pending').localeCompare(b.submissionStatus || 'Pending'),
    };
    return list.sort(sorters[sort] || sorters.dueDate);
  }, [assignments, search, filter, sort]);

  const handleSubmit = async (payload) => {
    if (!selected || !token) return;
    setSubmitting(true);
    try {
      await submitCourseAssignment({ token, assignmentId: selected.id, payload });
      toast.success('Assignment submitted!');
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton rows={5} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="glass-panel rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-widest text-indigo-500">Coursework</p>
        <h1 className="mt-1 font-heading text-3xl font-black text-[var(--mh-text)]">Assignment Dashboard</h1>
        <p className="mt-2 text-sm text-[var(--mh-text-muted)]">Upload files, track deadlines, and view grades.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} tone="emerald" />
        <StatCard label="Pending" value={stats.pending} tone="amber" />
        <StatCard label="Overdue" value={stats.overdue} tone="rose" />
        <StatCard label="Graded" value={stats.graded} tone="emerald" />
      </div>

      <div className="flex flex-wrap gap-3">
        <input className="mh-field max-w-xs" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="mh-field max-w-[140px]" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
          <option value="graded">Graded</option>
          <option value="completed">Submitted</option>
        </select>
        <select className="mh-field max-w-[140px]" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="dueDate">Due date</option>
          <option value="subject">Subject</option>
          <option value="status">Status</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-[var(--mh-text-muted)]">No assignments match your filters.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => {
            const dueSoon = !a.isOverdue && new Date(a.dueDateUtc) - Date.now() < 3 * 86400000;
            return (
              <article key={a.id} className={`glass-panel rounded-2xl p-6 ${a.isOverdue && !a.submissionStatus ? 'border border-rose-500/40' : dueSoon ? 'border border-amber-500/30' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--mh-text)]">{a.title}</h3>
                    <p className="text-sm text-indigo-400">{a.subject}{a.batchTitle ? ` · ${a.batchTitle}` : ''}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.isOverdue && !a.submissionStatus && <span className="rounded-full bg-rose-500/20 px-3 py-1 text-[10px] font-bold uppercase text-rose-300">Overdue</span>}
                    {a.submissionStatus && <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase text-emerald-300">{a.submissionStatus}</span>}
                    {a.isLate && <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold uppercase text-amber-300">Late</span>}
                  </div>
                </div>
                <p className="mt-2 text-sm text-[var(--mh-text-muted)] line-clamp-2">{a.instructions}</p>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                  <div><dt className="text-[var(--mh-text-subtle)]">Due</dt><dd className="font-semibold">{new Date(a.dueDateUtc).toLocaleString()}</dd></div>
                  <div><dt className="text-[var(--mh-text-subtle)]">Marks</dt><dd className="font-semibold">{a.marksObtained != null ? `${a.marksObtained}/${a.totalMarks}` : `${a.totalMarks} total`}</dd></div>
                  <div><dt className="text-[var(--mh-text-subtle)]">Grade</dt><dd className="font-semibold">{a.gradeLetter ? `${a.gradeLetter} (${a.percentage}%)` : '—'}</dd></div>
                </dl>
                {a.tutorFeedback && <p className="mt-2 rounded-xl bg-indigo-500/10 p-3 text-sm text-indigo-200">💬 {a.tutorFeedback}</p>}
                <button
                  type="button"
                  onClick={() => setSelected(a)}
                  disabled={
                    (a.isOverdue && !a.allowLateSubmission && !a.submissionStatus)
                    || (a.submissionStatus === 'Graded' || a.submissionStatus === 'Rejected')
                    || (a.submissionStatus === 'Submitted' && !a.allowResubmission)
                  }
                  className="mt-4 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  {a.submissionStatus === 'Graded' || a.submissionStatus === 'Rejected'
                    ? 'View graded work'
                    : a.submissionStatus === 'Submitted' && !a.allowResubmission
                      ? 'View submission'
                      : a.submissionStatus
                        ? 'View / update submission'
                        : 'Submit work'}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {selected && (
        <SubmitModal assignment={selected} onClose={() => setSelected(null)} onSubmit={handleSubmit} submitting={submitting} token={token} />
      )}
    </div>
  );
}

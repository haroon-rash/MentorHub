import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext.jsx';
import TutorDashboardLayout from '../../components/layout/TutorDashboardLayout.jsx';
import PageSkeleton from '../../components/ui/PageSkeleton.jsx';
import MultiFileUpload from '../../components/lms/MultiFileUpload.jsx';
import TutorStudyMaterialsPanel from '../../components/tutor/TutorStudyMaterialsPanel.jsx';
import { normalizeStudyMaterial, unwrapApiList } from '../../utils/apiData.js';
import {
  fetchTutorOnboardingProfile,
  fetchMyTutorBatches,
  createTutorBatch,
  updateTutorBatch,
  deleteTutorBatch,
  archiveTutorBatch,
  duplicateTutorBatch,
  completeTutorBatch,
  cancelTutorBatch,
  fetchTutorEnrollments,
  completeEnrollment,
  fetchEnrolledStudentDetail,
  fetchCourseAssignmentsForTutor,
  createCourseAssignment,
  updateCourseAssignment,
  extendAssignmentDeadline,
  rejectCourseAssignment,
  archiveCourseAssignment,
  fetchAssignmentSubmissions,
  queryAssignmentSubmissions,
  fetchSubmissionDetail,
  gradeAssignmentSubmission,
  fetchStudyMaterialsForTutor,
  fetchTutorDashboardStats,
  uploadDocument,
  extractUploadUrl,
} from '../../services/authApi.js';

const TABS = ['Batches', 'Enrollments', 'Assignments', 'Submissions', 'Study Materials'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyBatchForm = {
  title: '',
  subject: '',
  description: '',
  learningObjectives: '',
  difficultyLevel: 'Intermediate',
  startDateUtc: '',
  endDateUtc: '',
  daysOfWeekCsv: 'Monday,Wednesday,Friday',
  startTime: '17:00',
  endTime: '18:00',
  packageFee: '',
  maxStudents: 15,
  sessionMode: 'Online',
  locationOrMeetingInfo: '',
  inPersonAddress: '',
  inPersonBuildingDetails: '',
  locationNotes: '',
  onlineMeetingInstructions: '',
  visibility: 'PUBLIC', // PUBLIC = visible on student booking page; PRIVATE = hidden from booking until published as PUBLIC
  assignmentRules: '',
  isPublished: true,
};

const emptyAssignmentForm = {
  tutorBatchId: '',
  title: '',
  instructions: '',
  gradingRubric: '',
  attachmentUrlsCsv: '',
  totalMarks: 100,
  dueDateUtc: '',
  allowResubmission: true,
  allowLateSubmission: false,
};

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const tone =
    s === 'active' || s === 'published' || s === 'graded' ? 'bg-emerald-500/20 text-emerald-300' :
    s === 'pending' || s === 'submitted' ? 'bg-amber-500/20 text-amber-300' :
    s === 'archived' || s === 'expired' ? 'bg-slate-500/20 text-slate-400' :
    'bg-rose-500/20 text-rose-300';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>
      {status}
    </span>
  );
}

function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose, danger }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-bold text-[var(--mh-text)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--mh-text-muted)]">{message}</p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-[var(--mh-border)] py-2.5 text-sm font-bold">Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-2xl py-2.5 text-sm font-bold text-white ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TutorTeachingHub() {
  const { token } = useAuth();
  const [tab, setTab] = useState('Batches');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [batches, setBatches] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [submissionAnalytics, setSubmissionAnalytics] = useState(null);
  const [submissionPage, setSubmissionPage] = useState(1);
  const [submissionFilters, setSubmissionFilters] = useState({});
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [batchForm, setBatchForm] = useState(emptyBatchForm);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [gradeForm, setGradeForm] = useState({ submissionId: '', marksObtained: '', feedback: '', approve: true, returnForCorrection: false });
  const [enrollSearch, setEnrollSearch] = useState('');
  const [enrollSort, setEnrollSort] = useState('activity');
  const [confirmAction, setConfirmAction] = useState(null);
  const [saving, setSaving] = useState(false);

  const tutorSubjects = useMemo(() => {
    const fromProfile = profile?.subjects;
    if (Array.isArray(fromProfile) && fromProfile.length) return fromProfile;
    return [];
  }, [profile]);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const [prof, dashStats, batchList, enrollList, assignList, matList] = await Promise.all([
        fetchTutorOnboardingProfile(token),
        fetchTutorDashboardStats(token).catch(() => null),
        fetchMyTutorBatches(token).catch(() => []),
        fetchTutorEnrollments({ token }).catch(() => []),
        fetchCourseAssignmentsForTutor(token).catch(() => []),
        fetchStudyMaterialsForTutor(token).catch(() => []),
      ]);
      setProfile(prof);
      setStats(dashStats);
      setBatches(Array.isArray(batchList) ? batchList : []);
      setEnrollments(Array.isArray(enrollList) ? enrollList : []);
      setAssignments(Array.isArray(assignList) ? assignList : []);
      setMaterials(unwrapApiList(matList).map(normalizeStudyMaterial).filter(Boolean));
    } catch {
      toast.error('Could not load teaching hub data.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token]);

  const loadSubmissions = useCallback(async (page = 1, filters = submissionFilters) => {
    if (!token) return;
    try {
      const result = await queryAssignmentSubmissions({
        token,
        params: { ...filters, page, pageSize: 10 },
      });
      setSubmissions(result?.items || []);
      setSubmissionAnalytics(result?.analytics || null);
      setSubmissionPage(page);
    } catch {
      toast.error('Could not load submissions.');
      setSubmissions([]);
    }
  }, [token, submissionFilters]);

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(true), 30000);
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);
  useEffect(() => {
    if (tab === 'Submissions') loadSubmissions(1);
  }, [tab, loadSubmissions]);

  const uploadFile = async (file) => {
    const res = await uploadDocument(file, token);
    return extractUploadUrl(res);
  };

  const resetBatchForm = () => {
    setEditingBatchId(null);
    setBatchForm(emptyBatchForm);
  };

  const startEditBatch = (b) => {
    setEditingBatchId(b.id);
    setBatchForm({
      title: b.title || '',
      subject: b.subject || '',
      description: b.description || '',
      learningObjectives: b.learningObjectives || '',
      difficultyLevel: b.difficultyLevel || 'Intermediate',
      startDateUtc: b.startDateUtc ? b.startDateUtc.slice(0, 10) : '',
      endDateUtc: b.endDateUtc ? b.endDateUtc.slice(0, 10) : '',
      daysOfWeekCsv: b.daysOfWeekCsv || '',
      startTime: b.startTime || '17:00',
      endTime: b.endTime || '18:00',
      packageFee: b.packageFee ?? '',
      maxStudents: b.maxStudents ?? 15,
      sessionMode: b.isOnline ? 'Online' : 'InPerson',
      locationOrMeetingInfo: b.locationOrMeetingInfo || '',
      inPersonAddress: b.inPersonAddress || '',
      inPersonBuildingDetails: b.inPersonBuildingDetails || '',
      locationNotes: b.locationNotes || '',
      onlineMeetingInstructions: b.onlineMeetingInstructions || '',
      visibility: b.visibility || 'PUBLIC',
      assignmentRules: b.assignmentRules || '',
      isPublished: b.isPublished !== false,
    });
  };

  const buildBatchPayload = () => ({
    ...batchForm,
    packageFee: Number(batchForm.packageFee) || 0,
    maxStudents: Number(batchForm.maxStudents) || 15,
    startDateUtc: new Date(batchForm.startDateUtc).toISOString(),
    endDateUtc: new Date(batchForm.endDateUtc).toISOString(),
    locationOrMeetingInfo: batchForm.sessionMode === 'Online'
      ? batchForm.onlineMeetingInstructions
      : batchForm.inPersonAddress,
  });

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!batchForm.subject) {
      toast.error('Select a subject from your profile.');
      return;
    }
    if (batchForm.sessionMode === 'InPerson' && !batchForm.inPersonAddress) {
      toast.error('In-person address is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = buildBatchPayload();
      if (editingBatchId) {
        await updateTutorBatch({ token, batchId: editingBatchId, payload });
        toast.success('Batch updated.');
      } else {
        await createTutorBatch({ token, payload });
        toast.success('Batch created — sessions generated.');
      }
      resetBatchForm();
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save batch');
    } finally {
      setSaving(false);
    }
  };

  const runBatchAction = async (action, batchId) => {
    setSaving(true);
    try {
      if (action === 'archive') await archiveTutorBatch({ token, batchId });
      else if (action === 'duplicate') await duplicateTutorBatch({ token, batchId });
      else if (action === 'complete') await completeTutorBatch({ token, batchId });
      else if (action === 'cancel') await cancelTutorBatch({ token, batchId });
      else if (action === 'delete') await deleteTutorBatch({ token, batchId, force: false, archiveInstead: true });
      toast.success(`Batch ${action}${action.endsWith('e') ? 'd' : 'ed'}.`);
      load();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setSaving(false);
      setConfirmAction(null);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!token || !assignmentForm.tutorBatchId) {
      toast.error('Select a batch.');
      return;
    }
    const batch = batches.find((b) => b.id === assignmentForm.tutorBatchId);
    setSaving(true);
    try {
      await createCourseAssignment({
        token,
        payload: {
          ...assignmentForm,
          subject: batch?.subject || '',
          tutorBatchId: assignmentForm.tutorBatchId,
          totalMarks: Number(assignmentForm.totalMarks) || 100,
          dueDateUtc: new Date(assignmentForm.dueDateUtc).toISOString(),
        },
      });
      toast.success('Assignment published.');
      setAssignmentForm(emptyAssignmentForm);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to publish assignment');
    } finally {
      setSaving(false);
    }
  };

  const openStudentDetail = async (studentProfileId, batchId) => {
    try {
      const detail = await fetchEnrolledStudentDetail({ token, studentProfileId, batchId });
      setSelectedStudent(detail);
    } catch (err) {
      toast.error(err.message || 'Could not load student profile');
    }
  };

  const openSubmissionDetail = async (submissionId) => {
    try {
      const detail = await fetchSubmissionDetail({ token, submissionId });
      setSelectedSubmission(detail);
      setGradeForm({
        submissionId: detail.id,
        marksObtained: detail.marksObtained ?? '',
        feedback: detail.tutorFeedback || '',
        approve: true,
        returnForCorrection: false,
      });
    } catch (err) {
      toast.error(err.message || 'Could not load submission');
    }
  };

  const handleGrade = async (e) => {
    e.preventDefault();
    if (!gradeForm.submissionId || !token) return;
    const totalMarks = Number(selectedSubmission?.totalMarks) || 100;
    const marks = Number(gradeForm.marksObtained);
    if (!gradeForm.returnForCorrection) {
      if (Number.isNaN(marks) || marks < 0) {
        toast.error('Enter valid marks obtained.');
        return;
      }
      if (marks > totalMarks) {
        toast.error(`Marks obtained cannot exceed total marks (${totalMarks}).`);
        return;
      }
    }
    setSaving(true);
    try {
      await gradeAssignmentSubmission({
        token,
        submissionId: gradeForm.submissionId,
        payload: {
          marksObtained: Number(gradeForm.marksObtained),
          tutorFeedback: gradeForm.feedback,
          approve: gradeForm.approve,
          returnForCorrection: gradeForm.returnForCorrection,
        },
      });
      toast.success(gradeForm.returnForCorrection ? 'Returned for correction.' : 'Submission graded.');
      setSelectedSubmission(null);
      loadSubmissions(submissionPage);
    } catch (err) {
      toast.error(err.message || 'Grading failed');
    } finally {
      setSaving(false);
    }
  };

  const flatStudents = useMemo(() => {
    const list = enrollments.map((e) => ({
      ...e,
      batchTitle: e.batchTitle,
      batchId: e.tutorBatchId,
    }));
    let filtered = list;
    if (enrollSearch) {
      const q = enrollSearch.toLowerCase();
      filtered = filtered.filter((e) =>
        e.studentName?.toLowerCase().includes(q) ||
        e.subject?.toLowerCase().includes(q) ||
        e.batchTitle?.toLowerCase().includes(q));
    }
    const sorters = {
      performance: (a, b) => (b.amountPaid || 0) - (a.amountPaid || 0),
      attendance: (a, b) => a.studentName.localeCompare(b.studentName),
      pending: (a, b) => a.status.localeCompare(b.status),
      activity: (a, b) => new Date(b.startDateUtc) - new Date(a.startDateUtc),
      grades: (a, b) => a.studentName.localeCompare(b.studentName),
    };
    return [...filtered].sort(sorters[enrollSort] || sorters.activity);
  }, [enrollments, enrollSearch, enrollSort]);

  if (loading) {
    return (
      <TutorDashboardLayout profile={profile} stats={stats}>
        <PageSkeleton rows={6} />
      </TutorDashboardLayout>
    );
  }

  return (
    <TutorDashboardLayout profile={profile} stats={stats}>
      <motion.div className="space-y-6">
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-widest text-indigo-500">LMS</p>
          <h1 className="mt-1 font-heading text-3xl font-black text-[var(--mh-text)]">Teaching Hub</h1>
          <p className="mt-2 text-sm text-[var(--mh-text-muted)]">
            Manage batches, enrollments, assignments, submissions, and study materials.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${
                tab === t
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg'
                  : 'bg-[var(--mh-bg-elevated)] text-[var(--mh-text-muted)] hover:text-[var(--mh-text)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Batches' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleSaveBatch} className="glass-panel space-y-4 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xl font-bold text-[var(--mh-text)]">
                  {editingBatchId ? 'Edit course batch' : 'Create course batch'}
                </h2>
                {editingBatchId && (
                  <button type="button" onClick={resetBatchForm} className="text-xs font-bold text-indigo-400">Cancel edit</button>
                )}
              </div>
              <input className="mh-field" placeholder="Title *" value={batchForm.title} onChange={(e) => setBatchForm((p) => ({ ...p, title: e.target.value }))} required />
              <label className="block">
                <span className="mh-field-label">Subject * (from your profile)</span>
                <select className="mh-field" value={batchForm.subject} onChange={(e) => setBatchForm((p) => ({ ...p, subject: e.target.value }))} required>
                  <option value="">Select subject</option>
                  {tutorSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <textarea className="mh-field min-h-[60px]" placeholder="Description" value={batchForm.description} onChange={(e) => setBatchForm((p) => ({ ...p, description: e.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="mh-field-label">Start date</span><input type="date" className="mh-field" value={batchForm.startDateUtc} onChange={(e) => setBatchForm((p) => ({ ...p, startDateUtc: e.target.value }))} required /></label>
                <label className="block"><span className="mh-field-label">End date</span><input type="date" className="mh-field" value={batchForm.endDateUtc} onChange={(e) => setBatchForm((p) => ({ ...p, endDateUtc: e.target.value }))} required /></label>
              </div>
              <div>
                <span className="mh-field-label">Class days</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAYS.map((d) => {
                    const selected = batchForm.daysOfWeekCsv.includes(d);
                    return (
                      <button key={d} type="button" onClick={() => {
                        const parts = batchForm.daysOfWeekCsv.split(',').map((x) => x.trim()).filter(Boolean);
                        const next = selected ? parts.filter((x) => x !== d) : [...parts, d];
                        setBatchForm((p) => ({ ...p, daysOfWeekCsv: next.join(',') }));
                      }} className={`rounded-xl px-3 py-1.5 text-xs font-bold ${selected ? 'bg-indigo-600 text-white' : 'bg-[var(--mh-bg-elevated)] text-[var(--mh-text-muted)]'}`}>{d.slice(0, 3)}</button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="time" className="mh-field" value={batchForm.startTime} onChange={(e) => setBatchForm((p) => ({ ...p, startTime: e.target.value }))} />
                <input type="time" className="mh-field" value={batchForm.endTime} onChange={(e) => setBatchForm((p) => ({ ...p, endTime: e.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="number" className="mh-field" placeholder="Package fee ($)" value={batchForm.packageFee} onChange={(e) => setBatchForm((p) => ({ ...p, packageFee: e.target.value }))} />
                <input type="number" className="mh-field" placeholder="Max students" value={batchForm.maxStudents} onChange={(e) => setBatchForm((p) => ({ ...p, maxStudents: e.target.value }))} />
              </div>
              <select className="mh-field" value={batchForm.sessionMode} onChange={(e) => setBatchForm((p) => ({ ...p, sessionMode: e.target.value }))}>
                <option value="Online">Online — live video conference</option>
                <option value="InPerson">In-person</option>
              </select>
              {batchForm.sessionMode === 'Online' ? (
                <>
                  <input className="mh-field" placeholder="Platform (e.g. Zoom, Google Meet) — no URLs" value={batchForm.onlineMeetingInstructions} onChange={(e) => setBatchForm((p) => ({ ...p, onlineMeetingInstructions: e.target.value }))} />
                  <p className="text-xs text-[var(--mh-text-subtle)]">Meeting links are generated securely after students enroll — never shown publicly.</p>
                </>
              ) : (
                <>
                  <input className="mh-field" placeholder="Street address *" value={batchForm.inPersonAddress} onChange={(e) => setBatchForm((p) => ({ ...p, inPersonAddress: e.target.value }))} required />
                  <input className="mh-field" placeholder="Building / classroom" value={batchForm.inPersonBuildingDetails} onChange={(e) => setBatchForm((p) => ({ ...p, inPersonBuildingDetails: e.target.value }))} />
                  <input className="mh-field" placeholder="Location notes / map hints" value={batchForm.locationNotes} onChange={(e) => setBatchForm((p) => ({ ...p, locationNotes: e.target.value }))} />
                </>
              )}
              <select className="mh-field" value={batchForm.visibility} onChange={(e) => setBatchForm((p) => ({ ...p, visibility: e.target.value }))}>
                <option value="PUBLIC">Public — students can enroll from your profile</option>
                <option value="PRIVATE">Private — hidden from student booking (tutor roster only)</option>
              </select>
              <textarea className="mh-field min-h-[60px]" placeholder="Assignment rules (late policy, resubmission, etc.)" value={batchForm.assignmentRules} onChange={(e) => setBatchForm((p) => ({ ...p, assignmentRules: e.target.value }))} />
              <textarea className="mh-field min-h-[60px]" placeholder="Learning objectives" value={batchForm.learningObjectives} onChange={(e) => setBatchForm((p) => ({ ...p, learningObjectives: e.target.value }))} />
              <button type="submit" disabled={saving || tutorSubjects.length === 0} className="mh-btn-primary w-full py-3 disabled:opacity-50">
                {saving ? 'Saving…' : editingBatchId ? 'Save batch changes' : 'Create batch & generate sessions'}
              </button>
            </form>

            <div className="space-y-3">
              <h2 className="font-heading text-xl font-bold text-[var(--mh-text)]">Your batches ({batches.length})</h2>
              {batches.length === 0 ? (
                <p className="glass-panel rounded-2xl p-6 text-sm text-[var(--mh-text-muted)]">No batches yet.</p>
              ) : batches.map((b) => (
                <article key={b.id} className="glass-panel rounded-2xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-[var(--mh-text)]">{b.title}</h3>
                      <p className="text-sm text-indigo-400">{b.subject}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={b.lifecycleStatus || 'Active'} />
                      {!b.isPublished && <StatusBadge status="Draft" />}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-[var(--mh-text-muted)]">{b.scheduleLabel} · {b.enrolledCount}/{b.maxStudents} students</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => startEditBatch(b)} className="rounded-xl bg-indigo-600/20 px-3 py-1 text-xs font-bold text-indigo-300">Edit</button>
                    <button type="button" onClick={() => runBatchAction('duplicate', b.id)} className="rounded-xl bg-slate-500/20 px-3 py-1 text-xs font-bold text-slate-300">Duplicate</button>
                    <button type="button" onClick={() => setConfirmAction({ action: 'archive', batchId: b.id, title: 'Archive batch?', message: 'Students can no longer enroll. Existing enrollments remain.' })} className="rounded-xl bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300">Archive</button>
                    <button type="button" onClick={() => runBatchAction('complete', b.id)} className="rounded-xl bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">Complete</button>
                    <button type="button" onClick={() => setConfirmAction({ action: 'cancel', batchId: b.id, title: 'Cancel batch?', message: 'This will close the batch to new enrollments.', danger: true })} className="rounded-xl bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-300">Cancel</button>
                    <button type="button" onClick={() => setConfirmAction({ action: 'delete', batchId: b.id, title: 'Delete batch?', message: 'Active enrollments will prevent deletion unless archived.', danger: true })} className="rounded-xl bg-rose-600/20 px-3 py-1 text-xs font-bold text-rose-400">Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === 'Enrollments' && (
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              <input className="mh-field max-w-xs" placeholder="Search students…" value={enrollSearch} onChange={(e) => setEnrollSearch(e.target.value)} />
              <select className="mh-field max-w-[180px]" value={enrollSort} onChange={(e) => setEnrollSort(e.target.value)}>
                <option value="activity">Latest activity</option>
                <option value="performance">Performance</option>
                <option value="attendance">Name</option>
                <option value="pending">Status</option>
              </select>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[var(--mh-border)]">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-[var(--mh-bg-elevated)] text-left text-xs uppercase text-[var(--mh-text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Batch / Subject</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mh-border)]">
                  {flatStudents.map((e) => (
                    <tr key={e.id} className="hover:bg-indigo-500/5">
                      <td className="px-4 py-3 font-semibold">{e.studentName}</td>
                      <td className="px-4 py-3 text-[var(--mh-text-muted)]">{e.batchTitle} · {e.subject}</td>
                      <td className="px-4 py-3">{new Date(e.startDateUtc).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3">
                        <motion.div className="flex flex-wrap items-center gap-3">
                          {String(e.status).toLowerCase() === 'active' && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm(`Mark ${e.studentName}'s enrollment as completed? They can then leave a review.`)) return;
                                try {
                                  await completeEnrollment({ token, enrollmentId: e.id });
                                  toast.success('Enrollment marked complete — student can review.');
                                  load();
                                } catch (err) {
                                  toast.error(err.message || 'Could not complete enrollment');
                                }
                              }}
                              className="rounded-lg bg-emerald-600/20 px-2 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-600/30"
                            >
                              Mark complete
                            </button>
                          )}
                          <button type="button" onClick={() => openStudentDetail(e.studentProfileId, e.batchId)} className="text-xs font-bold text-indigo-400 hover:underline">View profile →</button>
                        </motion.div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Assignments' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <form onSubmit={handleCreateAssignment} className="glass-panel space-y-4 rounded-3xl p-6">
              <h2 className="font-heading text-xl font-bold">New assignment</h2>
              <select className="mh-field" value={assignmentForm.tutorBatchId} onChange={(e) => setAssignmentForm((p) => ({ ...p, tutorBatchId: e.target.value }))} required>
                <option value="">Select batch *</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.title} — {b.subject}</option>)}
              </select>
              {assignmentForm.tutorBatchId && (
                <p className="rounded-xl bg-indigo-500/10 px-3 py-2 text-xs text-indigo-300">
                  Subject auto-detected: <strong>{batches.find((b) => b.id === assignmentForm.tutorBatchId)?.subject}</strong>
                </p>
              )}
              <input className="mh-field" placeholder="Title *" value={assignmentForm.title} onChange={(e) => setAssignmentForm((p) => ({ ...p, title: e.target.value }))} required />
              <textarea className="mh-field min-h-[100px]" placeholder="Instructions *" value={assignmentForm.instructions} onChange={(e) => setAssignmentForm((p) => ({ ...p, instructions: e.target.value }))} required />
              <MultiFileUpload label="Reference materials" fileUrlsCsv={assignmentForm.attachmentUrlsCsv} onChange={(v) => setAssignmentForm((p) => ({ ...p, attachmentUrlsCsv: v }))} onUpload={uploadFile} />
              <input type="datetime-local" className="mh-field" value={assignmentForm.dueDateUtc} onChange={(e) => setAssignmentForm((p) => ({ ...p, dueDateUtc: e.target.value }))} required />
              <input type="number" className="mh-field" placeholder="Total marks" value={assignmentForm.totalMarks} onChange={(e) => setAssignmentForm((p) => ({ ...p, totalMarks: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assignmentForm.allowResubmission} onChange={(e) => setAssignmentForm((p) => ({ ...p, allowResubmission: e.target.checked }))} /> Allow resubmission</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={assignmentForm.allowLateSubmission} onChange={(e) => setAssignmentForm((p) => ({ ...p, allowLateSubmission: e.target.checked }))} /> Allow late submission</label>
              <button type="submit" disabled={saving} className="mh-btn-primary w-full py-3 disabled:opacity-50">{saving ? 'Publishing…' : 'Publish assignment'}</button>
            </form>
            <div className="space-y-3">
              <h2 className="font-heading text-xl font-bold">Published ({assignments.length})</h2>
              {assignments.map((a) => (
                <article key={a.id} className="glass-panel rounded-2xl p-4">
                  <div className="flex justify-between gap-2">
                    <p className="font-bold">{a.title}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-indigo-400">{a.subject} · {a.totalMarks} marks · {a.batchTitle}</p>
                  <p className="mt-1 text-xs text-[var(--mh-text-muted)]">Due {new Date(a.dueDateUtc).toLocaleString()} {a.isEditLocked ? '· Edit locked' : '· Editable (<1h)'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {a.canEdit && (
                      <button type="button" onClick={async () => {
                        const newTitle = prompt('New title', a.title);
                        if (!newTitle) return;
                        try {
                          await updateCourseAssignment({ token, assignmentId: a.id, payload: { title: newTitle, instructions: a.instructions, totalMarks: a.totalMarks, allowResubmission: a.allowResubmission, allowLateSubmission: a.allowLateSubmission } });
                          toast.success('Updated'); load();
                        } catch (err) { toast.error(err.message); }
                      }} className="text-xs font-bold text-indigo-400">Quick edit</button>
                    )}
                    {a.isEditLocked && (
                      <button type="button" onClick={async () => {
                        const d = prompt('New due date (ISO)', a.dueDateUtc);
                        if (!d) return;
                        try { await extendAssignmentDeadline({ token, assignmentId: a.id, dueDateUtc: new Date(d).toISOString() }); toast.success('Deadline extended'); load(); } catch (err) { toast.error(err.message); }
                      }} className="text-xs font-bold text-amber-400">Extend deadline</button>
                    )}
                    <button type="button" onClick={() => { setTab('Submissions'); loadSubmissions(1, { assignmentId: a.id }); }} className="text-xs font-bold text-indigo-400">Submissions →</button>
                    <button type="button" onClick={async () => { try { await archiveCourseAssignment({ token, assignmentId: a.id }); toast.success('Archived'); load(); } catch (err) { toast.error(err.message); } }} className="text-xs font-bold text-slate-400">Archive</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === 'Submissions' && (
          <div className="space-y-4">
            {submissionAnalytics && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ['Total', submissionAnalytics.totalAssignments],
                  ['Pending', submissionAnalytics.pendingCount],
                  ['Late', submissionAnalytics.lateCount],
                  ['Missing', submissionAnalytics.missingCount],
                  ['Reviewed', submissionAnalytics.reviewedCount],
                  ['Graded', submissionAnalytics.gradedCount],
                ].map(([label, val]) => (
                  <div key={label} className="glass-panel rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-[var(--mh-text)]">{val}</p>
                    <p className="text-xs text-[var(--mh-text-muted)]">{label}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="glass-panel rounded-3xl p-4 flex flex-wrap gap-3">
              <select className="mh-field max-w-[160px]" onChange={(e) => { const f = { ...submissionFilters, batchId: e.target.value || undefined }; setSubmissionFilters(f); loadSubmissions(1, f); }}>
                <option value="">All batches</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              <select className="mh-field max-w-[160px]" onChange={(e) => { const f = { ...submissionFilters, gradingStatus: e.target.value || undefined }; setSubmissionFilters(f); loadSubmissions(1, f); }}>
                <option value="">All grading</option>
                <option value="pending">Pending review</option>
                <option value="graded">Graded</option>
              </select>
              <select className="mh-field max-w-[140px]" onChange={(e) => { const f = { ...submissionFilters, isLate: e.target.value === '' ? undefined : e.target.value === 'true' }; setSubmissionFilters(f); loadSubmissions(1, f); }}>
                <option value="">On-time & late</option>
                <option value="true">Late only</option>
                <option value="false">On-time only</option>
              </select>
            </div>
            <div className="glass-panel overflow-x-auto rounded-3xl">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-[var(--mh-bg-elevated)] text-left text-xs uppercase text-[var(--mh-text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Assignment</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Files</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--mh-border)]">
                  {submissions.map((s) => (
                    <tr key={s.id} className="cursor-pointer hover:bg-indigo-500/5" onClick={() => openSubmissionDetail(s.id)}>
                      <td className="px-4 py-3 font-semibold">{s.studentName}</td>
                      <td className="px-4 py-3">{s.assignmentTitle}</td>
                      <td className="px-4 py-3">{s.submittedAtUtc ? new Date(s.submittedAtUtc).toLocaleString() : '—'} {s.isLate && <span className="text-rose-400">Late</span>}</td>
                      <td className="px-4 py-3">{s.fileCount}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3">{s.gradeLetter ? `${s.gradeLetter} (${s.percentage}%)` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center gap-3">
              <button type="button" disabled={submissionPage <= 1} onClick={() => loadSubmissions(submissionPage - 1)} className="rounded-xl border border-[var(--mh-border)] px-4 py-2 text-sm font-bold disabled:opacity-40">Previous</button>
              <span className="py-2 text-sm text-[var(--mh-text-muted)]">Page {submissionPage}</span>
              <button type="button" onClick={() => loadSubmissions(submissionPage + 1)} className="rounded-xl border border-[var(--mh-border)] px-4 py-2 text-sm font-bold">Next</button>
            </div>
          </div>
        )}

        {tab === 'Study Materials' && (
          <TutorStudyMaterialsPanel
            token={token}
            batches={batches}
            materials={materials}
            tutorSubjects={tutorSubjects}
            onRefresh={load}
            onUpload={uploadFile}
          />
        )}
      </motion.div>

      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-heading text-2xl font-bold">{selectedStudent.studentName}</h3>
              <p className="text-sm text-[var(--mh-text-muted)]">{selectedStudent.email} · Grade {selectedStudent.gradeLevel}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div><dt className="text-[var(--mh-text-subtle)]">Progress</dt><dd className="font-bold">{selectedStudent.progressPercentage}%</dd></div>
                <div><dt className="text-[var(--mh-text-subtle)]">Avg grade</dt><dd className="font-bold">{selectedStudent.averageGrade}%</dd></div>
                <div><dt className="text-[var(--mh-text-subtle)]">Completion</dt><dd className="font-bold">{selectedStudent.assignmentCompletionRate}%</dd></div>
                <div><dt className="text-[var(--mh-text-subtle)]">Joined</dt><dd className="font-bold">{selectedStudent.joinedDateUtc ? new Date(selectedStudent.joinedDateUtc).toLocaleDateString() : '—'}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-indigo-400">Subjects: {selectedStudent.enrolledSubjects?.join(', ')}</p>
              <h4 className="mt-4 font-bold">Pending assignments ({selectedStudent.pendingAssignments?.length || 0})</h4>
              <ul className="mt-2 space-y-1 text-sm text-[var(--mh-text-muted)]">
                {(selectedStudent.pendingAssignments || []).map((a) => <li key={a.id}>• {a.title} — due {new Date(a.dueDateUtc).toLocaleDateString()}</li>)}
              </ul>
              <h4 className="mt-4 font-bold">Recent submissions</h4>
              <ul className="mt-2 space-y-1 text-sm">
                {(selectedStudent.recentSubmissions || []).map((s) => <li key={s.id}>{s.assignmentTitle} — {s.status} {s.gradeLetter ? `(${s.gradeLetter})` : ''}</li>)}
              </ul>
              <button type="button" onClick={() => setSelectedStudent(null)} className="mt-6 w-full rounded-2xl border border-[var(--mh-border)] py-3 font-bold">Close</button>
            </motion.div>
          </div>
        )}

        {selectedSubmission && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={() => setSelectedSubmission(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-heading text-xl font-bold">{selectedSubmission.assignmentTitle}</h3>
              <p className="text-sm text-[var(--mh-text-muted)]">{selectedSubmission.studentName} · {selectedSubmission.status} {selectedSubmission.isLate && '· Late'}</p>
              {selectedSubmission.submissionText && <p className="mt-3 rounded-xl bg-[var(--mh-bg)] p-3 text-sm">{selectedSubmission.submissionText}</p>}
              {selectedSubmission.fileUrlsCsv && (
                <ul className="mt-3 space-y-1">
                  {selectedSubmission.fileUrlsCsv.split(',').map((url) => url.trim()).filter(Boolean).map((url) => (
                    <li key={url}><a href={url} target="_blank" rel="noreferrer" className="text-sm text-indigo-400 hover:underline">📎 Download file</a></li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleGrade} className="mt-4 space-y-3">
                <input
                  type="number"
                  min={0}
                  max={selectedSubmission?.totalMarks || 100}
                  className="mh-field"
                  placeholder={`Marks obtained (max ${selectedSubmission?.totalMarks || 100})`}
                  value={gradeForm.marksObtained}
                  onChange={(e) => {
                    const max = Number(selectedSubmission?.totalMarks) || 100;
                    const raw = e.target.value;
                    if (raw === '') {
                      setGradeForm((p) => ({ ...p, marksObtained: '' }));
                      return;
                    }
                    const n = Math.min(max, Math.max(0, Number(raw)));
                    setGradeForm((p) => ({ ...p, marksObtained: Number.isNaN(n) ? '' : String(n) }));
                  }}
                />
                <textarea className="mh-field min-h-[80px]" placeholder="Feedback / remarks" value={gradeForm.feedback} onChange={(e) => setGradeForm((p) => ({ ...p, feedback: e.target.value }))} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gradeForm.returnForCorrection} onChange={(e) => setGradeForm((p) => ({ ...p, returnForCorrection: e.target.checked, approve: !e.target.checked }))} /> Return for correction</label>
                {!gradeForm.returnForCorrection && (
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gradeForm.approve} onChange={(e) => setGradeForm((p) => ({ ...p, approve: e.target.checked }))} /> Approve submission</label>
                )}
                <button type="submit" disabled={saving} className="mh-btn-primary w-full py-3 disabled:opacity-50">{saving ? 'Saving…' : 'Submit review'}</button>
              </form>
              <button type="button" onClick={() => setSelectedSubmission(null)} className="mt-2 w-full rounded-2xl border border-[var(--mh-border)] py-2 text-sm font-bold">Close</button>
            </motion.div>
          </div>
        )}

        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel="Confirm"
            danger={confirmAction.danger}
            onClose={() => setConfirmAction(null)}
            onConfirm={() => runBatchAction(confirmAction.action, confirmAction.batchId)}
          />
        )}
      </AnimatePresence>
    </TutorDashboardLayout>
  );
}

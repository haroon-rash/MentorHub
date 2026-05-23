import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  fetchSuperAdminDashboard,
  fetchSuperAdminTutorRequests,
  fetchAdminAnalytics,
  reviewTutorVerification,
} from '../../services/authApi.js';
import { AnimatePresence } from 'framer-motion';

import AnimatedSection from '../../components/ui/AnimatedSection.jsx';
import PageSkeleton from '../../components/ui/PageSkeleton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { resolvePublicAssetUrl } from '../../utils/urls.js';

const statusOptions = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];
const MotionArticle = motion.article;
const MotionDiv = motion.div;


const emptyDashboard = {
  totalTutorRequests: 0,
  pendingTutorRequests: 0,
  approvedTutors: 0,
  rejectedTutors: 0,
  latestRequests: [],
};

function SuperAdminDashboard() {
  const { token } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState('PENDING');
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [notesById, setNotesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [submittingId, setSubmittingId] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [dashboardData, requestData, analyticsData] = await Promise.all([
          fetchSuperAdminDashboard(token),
          fetchSuperAdminTutorRequests({
            token,
            status: selectedStatus === 'ALL' ? '' : selectedStatus,
          }),
          fetchAdminAnalytics(token).catch(() => null),
        ]);

        if (!active) {
          return;
        }

        setDashboard(dashboardData || emptyDashboard);
        setRequests(Array.isArray(requestData) ? requestData : []);
        setAnalytics(analyticsData || null);
      } catch (error) {
        toast.error(error.message || 'Unable to load super-admin dashboard');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [token, selectedStatus]);

  const cards = useMemo(
    () => [
      { label: 'Total Revenue', value: `$${(analytics?.totalRevenue ?? dashboard.totalRevenue ?? 0).toLocaleString()}`, tone: 'from-emerald-500 to-teal-500' },
      { label: 'Bookings This Week', value: analytics?.bookingsThisWeek ?? '—', tone: 'from-sky-500 to-cyan-500' },
      { label: 'Platform Rating', value: analytics?.averagePlatformRating ? `${analytics.averagePlatformRating}★` : '—', tone: 'from-violet-500 to-indigo-500' },
      { label: 'Pending Verifications', value: analytics?.pendingTutors ?? dashboard.pendingTutorRequests, tone: 'from-amber-500 to-orange-500' },
    ],
    [dashboard, analytics],
  );

  const handleReview = async (request, approve) => {
    if (!token) {
      return;
    }

    setSubmittingId(request.tutorProfileId);
    try {
      const updated = await reviewTutorVerification({
        token,
        tutorProfileId: request.tutorProfileId,
        approve,
        notes: notesById[request.tutorProfileId] || '',
      });

      setRequests((prev) => prev.map((item) => (item.tutorProfileId === request.tutorProfileId ? updated : item)));
      toast.success(approve ? 'Tutor approved' : 'Tutor rejected');
      setSelectedRequest(null);

      try {
        const dashboardData = await fetchSuperAdminDashboard(token);
        setDashboard(dashboardData || emptyDashboard);
      } catch {
        // Review succeeded; dashboard refresh is non-critical.
      }
    } catch (error) {
      toast.error(error.message || 'Unable to submit review');
    } finally {
      setSubmittingId('');
    }
  };

  const resolveImageUrl = (url, folder = 'documents') => resolvePublicAssetUrl(url, folder);


  if (loading) {
    return <PageSkeleton rows={6} />;
  }

  return (
    <div className="space-y-6">
      <AnimatedSection className="glass-panel rounded-3xl p-6 sm:p-8" delay={0.04}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Super Admin Control</p>
            <h1 className="mt-1 font-heading text-3xl font-bold text-slate-900 sm:text-4xl">Platform Overview</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live System Monitoring
          </div>
        </div>
      </AnimatedSection>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <MotionArticle
            key={card.label}
            whileHover={{ y: -6 }}
            className="glass-panel rounded-3xl p-5"
          >
            <div className={`inline-flex rounded-2xl bg-gradient-to-r ${card.tone} px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white`}>
              {card.label}
            </div>
            <p className="mt-4 font-heading text-4xl font-bold text-slate-900">{card.value}</p>
          </MotionArticle>
        ))}
      </div>

      <AnimatedSection className="glass-panel rounded-3xl p-6" delay={0.08}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-6 mb-6">
          <h2 className="font-heading text-2xl font-bold text-slate-900">Tutor Verification Queue</h2>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelectedStatus(option)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${selectedStatus === option
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {loading && requests.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="mt-4 font-semibold">Scanning requests...</p>
          </div>
        ) : null}

        {!loading && requests.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <span className="text-5xl">🎉</span>
            <p className="mt-4 font-semibold">Queue is clear! No pending requests.</p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {requests.map((request) => (
            <MotionArticle
              key={request.tutorProfileId}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -4 }}
              onClick={() => { setSelectedRequest(request); setShowAdditionalInfo(false); }}
              className="group cursor-pointer rounded-[2rem] border border-slate-100 bg-white/70 p-5 transition-all hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-indigo-50">
                  {request.profilePhotoUrl ? (
                    <img src={resolveImageUrl(request.profilePhotoUrl, 'profiles')} alt={request.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-bold text-indigo-300">
                      {request.fullName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{request.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{request.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Education</span>
                  <span className="text-xs font-bold text-slate-700">{request.highestDegree}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Experience</span>
                  <span className="text-xs font-bold text-slate-700">{request.yearsOfExperience} years</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${request.verificationStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                    request.verificationStatus === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                  }`}>
                  {request.verificationStatus}
                </span>
                <span className="text-xs font-bold text-indigo-600">${request.hourlyFee}/hr</span>
              </div>
            </MotionArticle>
          ))}
        </div>
      </AnimatedSection>

      <AnimatePresence>
        {selectedRequest && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setSelectedRequest(null); setShowAdditionalInfo(false); }}
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
          >
            <MotionDiv
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[2.5rem] bg-white/95 shadow-2xl"
            >
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50/50 via-white to-cyan-50/50 opacity-50" />

              <div className="flex flex-col h-full max-h-[90vh]">
                {/* Header Section */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-white/50 p-6 backdrop-blur-sm sm:px-8">
                  <div className="flex items-center gap-5">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-2 border-white shadow-xl shadow-indigo-100">
                      {selectedRequest.profilePhotoUrl ? (
                        <img
                          src={resolveImageUrl(selectedRequest.profilePhotoUrl, 'profiles')}
                          alt={selectedRequest.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-cyan-400 text-3xl font-bold text-white">
                          {selectedRequest.fullName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-heading text-3xl font-black text-slate-900">{selectedRequest.fullName}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm font-bold text-slate-500">{selectedRequest.email}</p>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <p className="text-sm font-bold text-slate-500">Joined {new Date(selectedRequest.createdAtUtc).toLocaleDateString()}</p>
                      </div>
                      {selectedRequest.previouslyRemovedAtUtc && (
                        <div className="mt-4 rounded-2xl border-2 border-amber-400/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          <p className="font-bold">Previously removed from platform</p>
                          <p className="mt-1 text-xs">
                            Account was permanently deleted on{' '}
                            {new Date(selectedRequest.previouslyRemovedAtUtc).toLocaleString()}
                            {selectedRequest.previouslyRemovedReason
                              ? ` — Reason: ${selectedRequest.previouslyRemovedReason}`
                              : ''}
                          </p>
                          <p className="mt-1 text-xs text-amber-800">This is a re-registration. Review carefully before approving.</p>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-xl bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-700 border border-indigo-100">
                          🎓 {selectedRequest.highestDegree}
                        </span>
                        <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 border border-emerald-100">
                          💼 {selectedRequest.yearsOfExperience}y Experience
                        </span>
                        <span className="rounded-xl bg-cyan-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-700 border border-cyan-100">
                          📍 {selectedRequest.inPersonLocation || 'Remote Only'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedRequest(null); setShowAdditionalInfo(false); }}
                    className="rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                  <section>
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-5">
                      <span className="h-px w-6 bg-indigo-200" />
                      Verification Documents (required)
                    </h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Degree Certificate', url: selectedRequest.degreeCertificateUrl, icon: '🎓' },
                        { label: 'Government ID', url: selectedRequest.governmentIdDocumentUrl, icon: '🪪' },
                        ...(selectedRequest.teachingLicensesOrCertificatesUrl ? [{ label: 'Teaching License', url: selectedRequest.teachingLicensesOrCertificatesUrl, icon: '📜' }] : []),
                      ].map((doc) => (
                        <div key={doc.label} className="flex items-center justify-between rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-5">
                          <div className="flex items-center gap-4">
                            <div className="rounded-2xl bg-[var(--mh-bg-elevated)] p-3 text-xl">{doc.icon}</div>
                            <div>
                              <p className="text-sm font-black text-[var(--mh-text)]">{doc.label}</p>
                              <p className="text-[10px] font-bold uppercase tracking-tight text-[var(--mh-text-muted)]">Required for approval</p>
                            </div>
                          </div>
                          {doc.url ? (
                            <a
                              href={resolveImageUrl(doc.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-500"
                            >
                              View / download
                            </a>
                          ) : (
                            <span className="rounded-xl bg-slate-200 px-5 py-2.5 text-xs font-bold text-slate-500">Not uploaded</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-4">
                        <p className="text-[10px] font-bold uppercase text-[var(--mh-text-muted)]">Profile completeness</p>
                        <p className="mt-1 text-2xl font-black text-[var(--mh-text)]">{selectedRequest.profileCompleteness}%</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-4">
                        <p className="text-[10px] font-bold uppercase text-[var(--mh-text-muted)]">Hourly rate</p>
                        <p className="mt-1 text-2xl font-black text-indigo-400">${selectedRequest.hourlyFee}</p>
                      </div>
                      <div className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-4">
                        <p className="text-[10px] font-bold uppercase text-[var(--mh-text-muted)]">Teaching mode</p>
                        <p className="mt-1 text-lg font-black text-[var(--mh-text)]">{selectedRequest.teachingMode}</p>
                      </div>
                    </div>
                  </section>

                  <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.85fr]">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--mh-text-muted)]">Compliance checklist</h4>
                      <ul className="space-y-2 text-sm text-[var(--mh-text)]">
                        <li>✓ Background check consent: {selectedRequest.backgroundCheckConsent ? 'Yes' : 'No'}</li>
                        <li>✓ Terms accepted: {selectedRequest.termsAccepted ? 'Yes' : 'No'}</li>
                        <li>✓ Privacy accepted: {selectedRequest.privacyAccepted ? 'Yes' : 'No'}</li>
                        <li>✓ Commission policy: {selectedRequest.commissionPolicyAccepted ? 'Yes' : 'No'}</li>
                        <li>Government ID type: {selectedRequest.governmentIdType || '—'}</li>
                      </ul>
                      <button
                        type="button"
                        onClick={() => setShowAdditionalInfo((v) => !v)}
                        className="flex w-full items-center justify-between rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-5 py-4 text-left text-sm font-bold text-indigo-200"
                      >
                        Additional Information
                        <span>{showAdditionalInfo ? '▲' : '▼'}</span>
                      </button>
                      {showAdditionalInfo && (
                        <div className="space-y-6 rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-5">
                          <div>
                            <p className="text-xs font-bold uppercase text-[var(--mh-text-muted)]">Professional bio</p>
                            <p className="mt-2 text-sm text-[var(--mh-text)]">{selectedRequest.bio || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-[var(--mh-text-muted)]">Teaching philosophy</p>
                            <p className="mt-2 text-sm text-[var(--mh-text)]">{selectedRequest.teachingMethodology || '—'}</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <p className="text-sm"><strong>Field:</strong> {selectedRequest.fieldOfStudy || '—'}</p>
                            <p className="text-sm"><strong>Institution:</strong> {selectedRequest.institutionName || '—'}</p>
                            <p className="text-sm"><strong>Graduation:</strong> {selectedRequest.graduationYear || '—'}</p>
                            <p className="text-sm"><strong>Monthly fee:</strong> {selectedRequest.monthlyFee != null ? `$${selectedRequest.monthlyFee}` : '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-[var(--mh-text-muted)]">Subjects</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {selectedRequest.subjects?.map((s) => (
                                <span key={s} className="mh-badge-indigo rounded-full px-3 py-1 text-xs font-bold">{s}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-[var(--mh-text-muted)]">Grade levels</p>
                            <p className="mt-1 text-sm text-[var(--mh-text)]">{selectedRequest.gradeLevels?.join(', ') || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-[var(--mh-text-muted)]">Languages</p>
                            <p className="mt-1 text-sm text-[var(--mh-text)]">{selectedRequest.languages?.join(', ') || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-[var(--mh-text-muted)]">Availability</p>
                            <p className="mt-1 text-sm text-[var(--mh-text)]">Days: {selectedRequest.availableDays?.join(', ') || '—'}</p>
                            <p className="text-sm text-[var(--mh-text)]">Slots: {selectedRequest.availableTimeSlots?.join(', ') || '—'}</p>
                          </div>
                          {selectedRequest.achievements && (
                            <div>
                              <p className="text-xs font-bold uppercase text-[var(--mh-text-muted)]">Achievements</p>
                              <p className="mt-1 text-sm text-[var(--mh-text)]">{selectedRequest.achievements}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[2rem] bg-slate-900 p-8 shadow-2xl relative overflow-hidden">
                      <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-indigo-400 mb-6">
                        <span className="h-px w-6 bg-indigo-500" />
                        Official Verdict
                      </h4>
                      <textarea
                        className="w-full rounded-2xl border-0 bg-slate-800/50 p-5 text-sm text-white placeholder-slate-400 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-indigo-500"
                        placeholder="Provide feedback for the tutor..."
                        rows={4}
                        value={notesById[selectedRequest.tutorProfileId] || ''}
                        onChange={(event) =>
                          setNotesById((prev) => ({
                            ...prev,
                            [selectedRequest.tutorProfileId]: event.target.value,
                          }))
                        }
                      />
                      <div className="mt-8 flex gap-4">
                        <button
                          type="button"
                          disabled={submittingId === selectedRequest.tutorProfileId}
                          onClick={() => handleReview(selectedRequest, true)}
                          className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-500/20 transition-all hover:brightness-110 disabled:opacity-60"
                        >
                          {submittingId === selectedRequest.tutorProfileId ? 'SAVING...' : '✓ APPROVE'}
                        </button>
                        <button
                          type="button"
                          disabled={submittingId === selectedRequest.tutorProfileId}
                          onClick={() => handleReview(selectedRequest, false)}
                          className="flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-4 text-sm font-black text-white shadow-xl shadow-rose-500/20 transition-all hover:brightness-110 disabled:opacity-60"
                        >
                          {submittingId === selectedRequest.tutorProfileId ? 'SAVING...' : '✕ REJECT'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SuperAdminDashboard;

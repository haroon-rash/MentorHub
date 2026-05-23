import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { fetchAdminUserDetail } from '../../services/authApi.js';
import { resolvePublicAssetUrl } from '../../utils/urls.js';

function StatusBadge({ label, tone }) {
  const tones = {
    emerald: 'mh-badge-emerald',
    amber: 'mh-badge-amber',
    rose: 'mh-badge-rose',
    indigo: 'mh-badge-indigo',
    slate: 'mh-badge-indigo',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${tones[tone] || tones.slate}`}>
      {label}
    </span>
  );
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <p className="text-sm text-[var(--mh-text)]">
      <span className="font-bold text-[var(--mh-text-muted)]">{label}: </span>
      {value}
    </p>
  );
}

export default function UserDetailDrawer({ userId, token, onClose, onRequestDelete }) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !token) return;
    setLoading(true);
    fetchAdminUserDetail(userId, token)
      .then(setDetail)
      .catch(() => toast.error('Failed to load user details'))
      .finally(() => setLoading(false));
  }, [userId, token]);

  const photo = detail?.tutor?.profilePhotoUrl || detail?.student?.profilePhotoUrl;
  const t = detail?.tutor;
  const s = detail?.student;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--mh-border)] px-6 py-4">
          <h2 className="font-heading text-xl font-bold text-[var(--mh-text)]">User profile</h2>
          <button type="button" onClick={onClose} className="mh-btn-secondary rounded-xl px-3 py-1.5 text-sm font-bold">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : !detail ? (
            <p className="text-sm text-[var(--mh-text-muted)]">User not found.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl bg-[var(--mh-input-bg)]">
                  {photo ? (
                    <img
                      src={photo.startsWith('http') ? photo : resolvePublicAssetUrl(photo, 'profiles')}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-indigo-300">
                      {detail.fullName?.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-2xl font-black text-[var(--mh-text)]">{detail.fullName}</h3>
                  <p className="text-sm text-[var(--mh-text-muted)]">{detail.email}</p>
                  {detail.phoneNumber && <p className="text-sm text-[var(--mh-text-muted)]">{detail.phoneNumber}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge label={detail.role} tone="indigo" />
                    <StatusBadge label={detail.isEmailVerified ? 'Email verified' : 'Email unverified'} tone={detail.isEmailVerified ? 'emerald' : 'amber'} />
                    {t?.verificationStatus && (
                      <StatusBadge
                        label={`Tutor: ${t.verificationStatus}`}
                        tone={t.verificationStatus === 'Approved' ? 'emerald' : t.verificationStatus === 'Rejected' ? 'rose' : 'amber'}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Bookings', value: detail.activity?.totalBookings ?? 0 },
                  { label: 'Completed', value: detail.activity?.completedBookings ?? 0 },
                  { label: 'Pending', value: detail.activity?.pendingBookings ?? 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-3 text-center">
                    <p className="text-lg font-black text-[var(--mh-text)]">{item.value}</p>
                    <p className="text-[10px] font-bold uppercase text-[var(--mh-text-muted)]">{item.label}</p>
                  </div>
                ))}
              </div>

              {t && (
                <section className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-4 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">Tutor profile (full)</h4>
                  <Field label="Degree" value={t.highestDegree} />
                  <Field label="Field of study" value={t.fieldOfStudy} />
                  <Field label="Institution" value={t.institutionName} />
                  <Field label="Graduation year" value={t.graduationYear} />
                  <Field label="Experience" value={t.yearsOfExperience != null ? `${t.yearsOfExperience} years` : null} />
                  <Field label="Subjects" value={t.subjects?.join(', ')} />
                  <Field label="Grade levels" value={t.gradeLevels?.join(', ')} />
                  <Field label="Languages" value={t.languages?.join(', ')} />
                  <Field label="Rate" value={t.hourlyFee != null ? `$${t.hourlyFee}/hr` : null} />
                  <Field label="Monthly fee" value={t.monthlyFee != null ? `$${t.monthlyFee}` : null} />
                  <Field label="Teaching mode" value={t.teachingMode} />
                  <Field label="Location" value={t.inPersonLocation} />
                  <Field label="Methodology" value={t.teachingMethodology} />
                  <Field label="Available days" value={t.availableDays?.join(', ')} />
                  <Field label="Time slots" value={t.availableTimeSlots?.join(', ')} />
                  <Field label="Completeness" value={`${t.profileCompleteness}%`} />
                  <Field label="Bio" value={t.bio} />
                  <Field label="Achievements" value={t.achievements} />
                  <div className="flex flex-wrap gap-2 pt-2">
                    {t.degreeCertificateUrl && (
                      <a href={resolvePublicAssetUrl(t.degreeCertificateUrl, 'documents')} target="_blank" rel="noreferrer" className="mh-btn-manage text-xs">Degree cert</a>
                    )}
                    {t.governmentIdDocumentUrl && (
                      <a href={resolvePublicAssetUrl(t.governmentIdDocumentUrl, 'documents')} target="_blank" rel="noreferrer" className="mh-btn-manage text-xs">Gov ID</a>
                    )}
                    {t.teachingLicensesOrCertificatesUrl && (
                      <a href={resolvePublicAssetUrl(t.teachingLicensesOrCertificatesUrl, 'documents')} target="_blank" rel="noreferrer" className="mh-btn-manage text-xs">License</a>
                    )}
                  </div>
                  {t.tutorProfileId && t.verificationStatus !== 'Approved' && (
                    <Link to="/super-admin-dashboard" className="mt-2 inline-block text-xs font-bold text-indigo-300 hover:underline">
                      Open verification queue →
                    </Link>
                  )}
                </section>
              )}

              {s && (
                <section className="rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] p-4 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-widest text-sky-300">Student profile (full)</h4>
                  <Field label="Grade" value={s.gradeLevel} />
                  <Field label="Education level" value={s.educationLevel} />
                  <Field label="School" value={s.schoolOrInstitution} />
                  <Field label="City/area" value={s.cityOrArea} />
                  <Field label="Subjects" value={s.subjects?.join(', ')} />
                  <Field label="Difficulty topics" value={s.topicsOfDifficulty} />
                  <Field label="Purpose" value={s.tutoringPurpose} />
                  <Field label="Goals" value={s.learningGoals} />
                  <Field label="Preferred mode" value={s.preferredMode} />
                  <Field label="Preferred days" value={s.preferredDays?.join(', ')} />
                  <Field label="Preferred slots" value={s.preferredTimeSlots?.join(', ')} />
                  <Field label="Budget/session" value={s.budgetPerSession != null ? `$${s.budgetPerSession}` : null} />
                  <Field label="Budget/month" value={s.budgetPerMonth != null ? `$${s.budgetPerMonth}` : null} />
                  <Field label="Tutor gender pref" value={s.preferredTutorGender} />
                  <Field label="Language" value={s.preferredLanguageOfInstruction} />
                  <Field label="Guardian" value={s.guardianFullName} />
                  <Field label="Guardian contact" value={s.guardianContactNumber} />
                  <Field label="Completeness" value={`${s.profileCompleteness}%`} />
                </section>
              )}

              {(detail.warnings?.length > 0 || detail.restrictions?.length > 0) && (
                <section className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-rose-300">Moderation</h4>
                  {detail.warnings?.map((w) => (
                    <div key={w.id} className="mh-badge-amber rounded-xl px-3 py-2 text-xs">
                      Warning: {w.category} ({w.severity}) — {w.notes}
                    </div>
                  ))}
                  {detail.restrictions?.filter((r) => r.isActive).map((r) => (
                    <div key={r.id} className="mh-badge-rose rounded-xl px-3 py-2 text-xs">
                      Restriction: {r.restrictionType} — {r.reason}
                    </div>
                  ))}
                </section>
              )}

              {detail.verificationHistory?.length > 0 && (
                <section>
                  <h4 className="text-xs font-black uppercase tracking-widest text-[var(--mh-text-muted)]">Verification history</h4>
                  <ul className="mt-2 space-y-2">
                    {detail.verificationHistory.map((a, i) => (
                      <li key={i} className="rounded-xl border border-[var(--mh-border)] px-3 py-2 text-xs text-[var(--mh-text)]">
                        <strong>{a.action}</strong> · {new Date(a.actionAtUtc).toLocaleString()}
                        {a.notes && <span className="block text-[var(--mh-text-muted)]">{a.notes}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        {detail && (
          <div className="flex gap-2 border-t border-[var(--mh-border)] p-4">
            <button
              type="button"
              onClick={() => navigate(`/chat?partner=${encodeURIComponent(detail.authUserId)}`)}
              className="flex-1 rounded-2xl border border-indigo-500/40 bg-indigo-500/15 py-3 text-sm font-bold text-indigo-200 hover:bg-indigo-500/25"
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => navigate(`/super-admin/moderation?email=${encodeURIComponent(detail.email)}`)}
              className="flex-1 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500"
            >
              Open moderation
            </button>
            <button type="button" onClick={() => onRequestDelete(detail)} className="mh-btn-danger-soft px-4 py-3 text-sm">
              Remove
            </button>
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}

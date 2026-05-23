import React, { useState } from 'react';
import { Star, Clock, CheckCircle, Lock, MessageSquare } from 'lucide-react';
import UdemyStyleReviewModal from './UdemyStyleReviewModal.jsx';
import { toast } from 'sonner';

export default function ReviewCourseCard({ enrollment, token, onReviewSubmitted, compact = false }) {
  const [modalOpen, setModalOpen] = useState(false);

  const canReview = enrollment.canReview === true;
  const alreadyReviewed = enrollment.alreadyReviewed === true || enrollment.AlreadyReviewed === true;
  const status = String(enrollment.status || enrollment.Status || '');
  const daysLeft = enrollment.daysRemaining ?? enrollment.DaysRemaining ?? 0;
  const reason = enrollment.reason || enrollment.Reason;

  const openReview = () => {
    if (!canReview) return;
    setModalOpen(true);
  };

  const handleSubmitted = () => {
    toast.success('Review published! It will improve tutor recommendations.');
    onReviewSubmitted?.();
  };

  if (compact && !canReview && !alreadyReviewed) {
    return null;
  }

  return (
    <>
      <div
        className={`rounded-2xl border p-4 ${
          canReview
            ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-indigo-500/5'
            : alreadyReviewed
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-[var(--mh-border)] bg-[var(--mh-bg-elevated)]'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                canReview ? 'bg-amber-500/20 text-amber-300' : alreadyReviewed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-400'
              }`}
            >
              {alreadyReviewed ? <CheckCircle size={20} /> : canReview ? <Star size={20} /> : <Lock size={20} />}
            </span>
            <div>
              <p className="font-bold text-[var(--mh-text)]">
                {canReview ? 'Leave a review' : alreadyReviewed ? 'Review submitted' : 'Review not available yet'}
              </p>
              {!compact && (
                <p className="mt-0.5 text-sm text-[var(--mh-text-muted)]">
                  {enrollment.batchTitle || enrollment.subject} · {enrollment.tutorName}
                </p>
              )}
              {canReview && daysLeft > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-400">
                  <Clock size={12} /> {daysLeft} day{daysLeft === 1 ? '' : 's'} left to review
                </p>
              )}
              {!canReview && !alreadyReviewed && reason && (
                <p className="mt-1 text-xs text-[var(--mh-text-muted)]">{reason}</p>
              )}
              {!canReview && !alreadyReviewed && status === 'Active' && !reason && (
                <p className="mt-1 text-xs text-[var(--mh-text-muted)]">
                  Reviews open when your course is <strong>Completed</strong>, <strong>Expired</strong>, or after you <strong>Withdraw</strong> under the early-leave policy.
                </p>
              )}
              {!canReview && !alreadyReviewed && status === 'Withdrawn' && !reason && (
                <p className="mt-1 text-xs text-[var(--mh-text-muted)]">
                  You have 10 days after withdrawal to share feedback about your tutor.
                </p>
              )}
            </div>
          </div>
          {canReview && (
            <button
              type="button"
              onClick={openReview}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-amber-400 hover:to-orange-400"
            >
              <MessageSquare size={14} />
              Write review
            </button>
          )}
        </div>
      </div>

      <UdemyStyleReviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        token={token}
        enrollment={enrollment}
        onSubmitted={handleSubmitted}
      />
    </>
  );
}

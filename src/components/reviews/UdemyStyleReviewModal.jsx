import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import InteractiveStarRating from './InteractiveStarRating.jsx';
import { createReview } from '../../services/authApi.js';

export default function UdemyStyleReviewModal({
  open,
  onClose,
  token,
  enrollment,
  onSubmitted,
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState('form');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const canSubmit = rating >= 1 && comment.trim().length >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || !token) return;
    setSubmitting(true);
    setStep('submitting');
    try {
      const res = await createReview({
        token,
        payload: {
          enrollmentId: enrollment.enrollmentId || enrollment.id,
          tutorProfileId: enrollment.tutorProfileId,
          rating,
          comment: comment.trim(),
        },
      });
      setResult(res);
      setStep('success');
      onSubmitted?.(res);
    } catch (err) {
      setStep('form');
      toast.error(err.message || 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    setStep('form');
    setResult(null);
    onClose?.();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          aria-label="Close"
          onClick={handleClose}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-indigo-500/30 bg-[var(--mh-bg)] shadow-2xl shadow-indigo-900/40"
        >
          <motion.div className="bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-transparent px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-indigo-300">Course review</p>
                <h2 id="review-modal-title" className="mt-1 font-heading text-xl font-bold text-[var(--mh-text)]">
                  How was your experience?
                </h2>
                <p className="mt-1 text-sm text-[var(--mh-text-muted)]">
                  {enrollment.batchTitle || enrollment.subject} · {enrollment.tutorName}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-2 text-[var(--mh-text-muted)] hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>

          <motion.div className="px-6 pb-6 pt-2">
            {step === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-center text-xs text-[var(--mh-text-muted)]">
                  Your rating helps other students find quality tutors. Reviews are analyzed by AI and used in personalized recommendations.
                </p>
                <InteractiveStarRating rating={rating || 0} onChange={setRating} />
                <div>
                  <label className="mb-2 block text-sm font-bold text-[var(--mh-text)]">
                    Written review <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={5}
                    minLength={10}
                    placeholder="What did you learn? How was the teaching style, pacing, and support? (min. 10 characters)"
                    className="w-full resize-none rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] px-4 py-3 text-sm leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <p className="mt-1 text-right text-xs text-[var(--mh-text-muted)]">
                    {comment.trim().length}/10 min characters
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Submit review & help recommendations
                </button>
              </form>
            )}

            {step === 'submitting' && (
              <motion.div className="flex flex-col items-center py-10 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  className="mb-4 text-indigo-400"
                >
                  <Sparkles size={40} />
                </motion.div>
                <p className="font-bold text-[var(--mh-text)]">Saving your review…</p>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div className="flex flex-col items-center py-8 text-center">
                <CheckCircle2 size={48} className="text-emerald-400" />
                <p className="mt-4 font-heading text-lg font-bold text-[var(--mh-text)]">Thank you for your review!</p>
                <p className="mt-2 text-sm text-[var(--mh-text-muted)]">
                  {result?.processingStatus === 'background' ? (
                    <span className="block text-indigo-300">
                      AI sentiment and tutor recommendations are updating in the background. Your stars and comments will improve matching for other students shortly.
                    </span>
                  ) : (
                    <>
                      {result?.sentiment && (
                        <span className="block text-indigo-300">
                          AI sentiment: <strong>{result.sentiment}</strong>
                          {result.sentimentConfidence != null && ` (${Math.round(Number(result.sentimentConfidence) * 100)}% confidence)`}
                        </span>
                      )}
                      Your feedback improves tutor matching for students with similar interests.
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white"
                >
                  Done
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import React, { useMemo } from 'react';
import { ShieldCheck, Star } from 'lucide-react';
import StarRating from '../StarRating/StarRating.jsx';

function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-3 font-bold text-slate-500">{star}</span>
      <Star size={10} className="fill-amber-400 text-amber-400" />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-slate-400">{pct}%</span>
    </div>
  );
}

function ReviewItem({ review }) {
  const date = review.createdAtUtc
    ? new Date(review.createdAtUtc).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const verified = review.verified !== false;
  const typeLabel = review.enrollmentId
    ? 'Verified course enrollment'
    : review.bookingId
      ? 'Verified session'
      : 'Verified learner';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-sm font-bold text-white">
            {(review.studentName || 'S')[0]}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{review.studentName || 'Verified Student'}</p>
            <p className="text-[11px] text-slate-400">{date}</p>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>

      {verified && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
          <ShieldCheck size={11} />
          {typeLabel}
        </p>
      )}

      {review.comment && (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{review.comment}</p>
      )}

      <p className="mt-3 text-[10px] text-slate-400">Read-only · Reviews cannot be edited by other users</p>
    </article>
  );
}

export default function PublicReviewsList({ reviews = [] }) {
  const list = Array.isArray(reviews) ? reviews : [];

  const stats = useMemo(() => {
    const total = list.length;
    if (total === 0) return { total: 0, avg: 0, breakdown: [0, 0, 0, 0, 0] };
    const breakdown = [0, 0, 0, 0, 0];
    let sum = 0;
    list.forEach((r) => {
      const star = Math.min(5, Math.max(1, Number(r.rating) || 0));
      breakdown[star - 1] += 1;
      sum += star;
    });
    return { total, avg: sum / total, breakdown };
  }, [list]);

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-slate-400">
        <span className="text-4xl">⭐</span>
        <p className="mt-3 text-sm font-bold">No reviews yet</p>
        <p className="text-xs">Only students who completed a course or session can leave a review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 md:grid-cols-[200px_1fr]">
        <div className="text-center md:text-left">
          <p className="font-heading text-4xl font-black text-slate-900">{stats.avg.toFixed(1)}</p>
          <div className="mt-1 flex justify-center md:justify-start">
            <StarRating rating={stats.avg} />
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {stats.total} verified review{stats.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <RatingBar key={star} star={star} count={stats.breakdown[star - 1]} total={stats.total} />
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Reviews are read-only for everyone (like Daraz). Names are partially hidden. Only verified enrollments or completed sessions can submit reviews.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}

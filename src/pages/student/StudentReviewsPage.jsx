import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Star, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import PageSkeleton from '../../components/ui/PageSkeleton.jsx';
import ReviewCourseCard from '../../components/reviews/ReviewCourseCard.jsx';
import { fetchReviewPrompts } from '../../services/authApi.js';

export default function StudentReviewsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await fetchReviewPrompts(token);
      setItems(Array.isArray(list) ? list : []);
    } catch {
      toast.error('Could not load your courses');
    } finally {
      setLoading(false);
    }
  }, [token, refreshKey]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSkeleton rows={4} />;

  const pending = items.filter((p) => p.canReview);
  const submitted = items.filter((p) => p.alreadyReviewed);
  const upcoming = items.filter((p) => !p.canReview && !p.alreadyReviewed);

  return (
    <motion.div className="mx-auto max-w-3xl space-y-6">
      <motion.div className="glass-panel overflow-hidden rounded-3xl">
        <div className="bg-gradient-to-br from-amber-500/20 via-indigo-600/20 to-transparent px-6 py-8 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/25 text-amber-300">
              <Star size={24} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-400">Student feedback</p>
              <h1 className="font-heading text-3xl font-black text-[var(--mh-text)]">Rate your courses</h1>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--mh-text-muted)]">
            Like Udemy, you can rate tutors after finishing a course. Your stars and comments are analyzed by AI, then
            combined with your profile interests, bookings, and enrollments to recommend the best-matched teachers.
          </p>
          <Link to="/student/enrollments" className="mt-3 inline-block text-xs font-bold text-indigo-400 hover:underline">
            ← My courses
          </Link>
        </div>
      </motion.div>

      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-amber-400">
            <Star size={16} /> Ready to review ({pending.length})
          </h2>
          <div className="space-y-4">
            {pending.map((p) => (
              <ReviewCourseCard
                key={p.enrollmentId}
                enrollment={{ ...p, id: p.enrollmentId }}
                token={token}
                onReviewSubmitted={() => setRefreshKey((k) => k + 1)}
              />
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <div className="glass-panel rounded-2xl border border-dashed border-[var(--mh-border)] p-8 text-center">
          <p className="font-semibold text-[var(--mh-text)]">No reviews waiting right now</p>
          <p className="mt-2 text-sm text-[var(--mh-text-muted)]">
            When a course is <strong>Completed</strong> or <strong>Expired</strong>, a &quot;Write review&quot; button
            appears here and under <Link to="/student/enrollments" className="text-indigo-400 hover:underline">My Courses</Link>.
          </p>
        </div>
      )}

      {submitted.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-emerald-400">
            Submitted ({submitted.length})
          </h2>
          <div className="space-y-3">
            {submitted.map((p) => (
              <ReviewCourseCard
                key={p.enrollmentId}
                enrollment={{ ...p, id: p.enrollmentId }}
                token={token}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--mh-text-muted)]">
            <Info size={16} /> All enrollments
          </h2>
          <div className="space-y-3">
            {upcoming.map((p) => (
              <ReviewCourseCard
                key={p.enrollmentId}
                enrollment={{ ...p, id: p.enrollmentId }}
                token={token}
              />
            ))}
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-[var(--mh-text-muted)]">
        <strong className="text-indigo-300">How recommendations use your review:</strong> AI reads sentiment from your
        comment → tutor score updates → home feed ranks tutors by subject interest (your profile), bookings, ratings,
        and course enrollments.
      </div>
    </motion.div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Sparkles,
  TrendingUp,
  Target,
  BookOpen,
  Users,
  Search,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Role } from '../../constants/roles.js';
import RecommendedTutorCard from '../../components/student/RecommendedTutorCard.jsx';
import SkeletonCard from '../../components/ui/SkeletonCard.jsx';
import { fetchPersonalizedFeed, trackTutorInteraction } from '../../services/recommendationApi.js';
import { fetchStudentOnboardingProfile, fetchReviewPrompts } from '../../services/authApi.js';
import { MIN_BOOKING_COMPLETENESS, canBookWithProfile } from '../../utils/studentProfile.js';
import AdminPriorityBanner from '../../components/admin/AdminPriorityBanner.jsx';

const SECTION_ICONS = {
  recommended_for_you: Sparkles,
  trending_tutors: TrendingUp,
  best_match: Target,
  continue_learning: BookOpen,
  similar_tutors: Users,
};

function FeedRow({ sectionKey, section, onTutorView }) {
  if (!section?.tutors?.length) return null;
  const Icon = SECTION_ICONS[sectionKey] || Sparkles;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
            <Icon size={18} />
          </span>
          <motion.div>
            <h2 className="font-heading text-xl font-bold text-[var(--mh-text)]">{section.title}</h2>
            <p className="text-xs text-[var(--mh-text-muted)]">{section.count} tutors ranked for you</p>
          </motion.div>
        </div>
        <Link
          to="/tutors"
          className="hidden items-center gap-1 text-sm font-semibold text-indigo-400 hover:text-indigo-300 sm:flex"
        >
          Explore all
          <ChevronRight size={16} />
        </Link>
      </div>
      <div className="-mx-1 flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
        {section.tutors.map((tutor, i) => (
          <RecommendedTutorCard
            key={tutor.tutorProfileId}
            tutor={tutor}
            rank={sectionKey === 'recommended_for_you' ? i + 1 : undefined}
            onView={onTutorView}
          />
        ))}
      </div>
    </section>
  );
}

function SubjectShelf({ shelf }) {
  if (!shelf?.tutors?.length) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap size={18} className="text-amber-400" />
        <h2 className="font-heading text-xl font-bold text-[var(--mh-text)]">
          Top in {shelf.subject}
        </h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {shelf.tutors.map((tutor) => (
          <RecommendedTutorCard key={tutor.tutorProfileId} tutor={tutor} />
        ))}
      </div>
    </section>
  );
}

export default function StudentHomePage() {
  const { token, name, role } = useAuth();
  const [feed, setFeed] = useState(null);
  const [profile, setProfile] = useState(null);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [feedRes, profileRes, reviewPrompts] = await Promise.all([
        fetchPersonalizedFeed(token),
        fetchStudentOnboardingProfile(token).catch(() => null),
        fetchReviewPrompts(token).catch(() => []),
      ]);
      setFeed(feedRes);
      setProfile(profileRes);
      const pending = (Array.isArray(reviewPrompts) ? reviewPrompts : []).filter((r) => r.canReview);
      setPendingReviews(pending.length);
    } catch (e) {
      toast.error(e.message || 'Could not load recommendations');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTutorView = useCallback(
    (tutor) => {
      if (!token) return;
      trackTutorInteraction({
        token,
        tutorProfileId: tutor.tutorProfileId,
        interactionType: 'click',
        subject: tutor.primarySubject,
      }).catch(() => {});
    },
    [token],
  );

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !token) return;
    trackTutorInteraction({
      token,
      interactionType: 'search',
      query: searchQuery.trim(),
    })
      .then(() => load())
      .catch(() => {});
    toast.success('Updating your feed based on your search');
  };

  const completeness = profile?.profileCompleteness ?? 0;
  const bookingReady = canBookWithProfile(completeness);
  const interests = feed?.interest_topics || profile?.interests || [];

  const sections = feed?.sections || {};
  const sectionOrder = [
    'recommended_for_you',
    'best_match',
    'continue_learning',
    'trending_tutors',
    'similar_tutors',
  ];

  return (
    <motion.div className="space-y-10 pb-16">
      <AdminPriorityBanner token={token} />
      {pendingReviews > 0 && (
        <Link
          to="/student/reviews"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-5 py-4 transition hover:border-amber-400/60"
        >
          <div>
            <p className="text-sm font-bold text-amber-200">⭐ Rate your completed courses</p>
            <p className="mt-0.5 text-xs text-[var(--mh-text-muted)]">
              {pendingReviews} review{pendingReviews > 1 ? 's' : ''} waiting — AI uses your feedback to improve tutor recommendations.
            </p>
          </div>
          <span className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white">Write review</span>
        </Link>
      )}
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/80 via-[var(--mh-bg-elevated)] to-violet-950/50 p-6 sm:p-10"
      >
        <motion.div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"
          aria-hidden
        />
        <motion.div
          className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 max-w-2xl">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-200">
            <Sparkles size={14} />
            AI-Powered For You
          </p>
          <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            {name ? `Welcome back, ${name.split(' ')[0]}` : 'Your learning feed'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-indigo-100/80 sm:text-base">
            Tutors ranked by your subject interests, bookings, reviews & ratings, and course enrollments.
          </p>

          {interests.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {interests.slice(0, 8).map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90"
                >
                  {topic}
                </span>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSearch} className="mt-6 flex max-w-md gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mh-text-muted)]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Java, IELTS, DSA..."
                className="mh-input w-full pl-10"
              />
            </div>
            <button type="submit" className="glow-button shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white">
              Search
            </button>
          </form>
        </div>

        {!bookingReady ? (
          <Link
            to="/student-profile"
            className="relative z-10 mt-6 inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25"
          >
            Complete profile ({completeness}% / {MIN_BOOKING_COMPLETENESS}% to book)
            <ChevronRight size={16} />
          </Link>
        ) : null}
      </motion.div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {sectionOrder.map((key) => (
            <FeedRow
              key={key}
              sectionKey={key}
              section={sections[key]}
              onTutorView={handleTutorView}
            />
          ))}

          {(feed?.sections?.top_by_subject || []).map((shelf) => (
            <SubjectShelf key={shelf.subject} shelf={shelf} />
          ))}

          {!feed?.sections?.recommended_for_you?.tutors?.length ? (
            <div className="glass-panel rounded-2xl p-10 text-center">
              <p className="font-heading text-xl font-bold text-[var(--mh-text)]">Building your feed</p>
              <p className="mt-2 text-sm text-[var(--mh-text-muted)]">
                Add learning interests in your profile, then browse tutors — recommendations improve with every interaction.
              </p>
              <Link
                to="/student-profile"
                className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white"
              >
                Set up interests
              </Link>
            </div>
          ) : null}
        </>
      )}
    </motion.div>
  );
}

/** Route wrapper: students see personalized home; others see marketing home */
export function HomeRouter() {
  const { role, token } = useAuth();
  const isStudent = token && String(role || '').toUpperCase() === Role.STUDENT;

  if (isStudent) {
    return <StudentHomePage />;
  }

  const HomePage = React.lazy(() => import('../HomePage/HomePage.jsx'));
  return (
    <React.Suspense fallback={<motion.div className="p-8 text-center text-[var(--mh-text-muted)]">Loading...</motion.div>}>
      <HomePage />
    </React.Suspense>
  );
}

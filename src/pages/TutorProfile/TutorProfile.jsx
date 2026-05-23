import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedSection from '../../components/ui/AnimatedSection.jsx';
import SkeletonCard from '../../components/ui/SkeletonCard.jsx';
import StarRating from '../../components/StarRating/StarRating.jsx';
import PublicReviewsList from '../../components/reviews/PublicReviewsList.jsx';
import { fetchApprovedTutorById, fetchTutorReviews, fetchStudentOnboardingProfile } from '../../services/authApi.js';
import { canBookWithProfile, MIN_BOOKING_COMPLETENESS } from '../../utils/studentProfile.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { mapApprovedTutorToCardModel } from '../../utils/approvedTutorMapper.js';
import { resolvePublicAssetUrl } from '../../utils/urls.js';


function TutorProfile() {
  const navigate = useNavigate();
  const { tutorId } = useParams();
  const { token } = useAuth();
  const [tutor, setTutor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    const loadTutor = async () => {
      if (!tutorId) { setIsNotFound(true); setIsLoading(false); return; }
      try {
        const [result, reviewData] = await Promise.all([
          fetchApprovedTutorById(tutorId),
          fetchTutorReviews(tutorId).catch(() => []),
        ]);
        if (!active) return;
        setTutor(mapApprovedTutorToCardModel(result));
        setReviews(Array.isArray(reviewData) ? reviewData : []);
        setIsNotFound(false);
      } catch {
        if (active) { setIsNotFound(true); setTutor(null); toast.error('Tutor not found or not approved'); }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadTutor();
    return () => { active = false; };
  }, [tutorId]);

  const sessionRate = useMemo(() => Number(tutor?.fee || 0), [tutor]);
  const reviewCount = reviews.length;
  const avgRating = useMemo(() => {
    if (reviewCount > 0) {
      const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
      return sum / reviewCount;
    }
    return Number(tutor?.averageRating ?? tutor?.rating ?? 0);
  }, [reviews, reviewCount, tutor]);

  if (isLoading) return (
    <div className="space-y-6"><SkeletonCard /><SkeletonCard /></div>
  );

  if (isNotFound || !tutor) return (
    <AnimatedSection className="glass-panel rounded-3xl p-8 text-center" delay={0.06}>
      <h1 className="font-heading text-3xl font-extrabold text-slate-900">Tutor Not Available</h1>
      <p className="mt-2 text-slate-600">This tutor may not be approved anymore or the profile id is invalid.</p>
      <button type="button" onClick={() => navigate('/tutors')}
        className="glow-button mt-5 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-3 font-semibold text-white">
        Back to Tutors
      </button>
    </AnimatedSection>
  );

  const handleBook = async () => {
    if (!token) {
      toast.error('Please sign in to book a session');
      navigate('/auth');
      return;
    }
    try {
      const profile = await fetchStudentOnboardingProfile(token);
      const completeness = profile?.profileCompleteness ?? 0;
      if (!canBookWithProfile(completeness)) {
        toast.error(`Complete at least ${MIN_BOOKING_COMPLETENESS}% of your profile to book (currently ${completeness}%)`);
        navigate('/student-profile');
        return;
      }
    } catch {
      toast.error('Please complete your student profile before booking');
      navigate('/student-profile');
      return;
    }
    navigate(`/schedule/${tutorId}`);
  };

  return (
    <div className="space-y-6">
      <AnimatedSection className="glass-panel rounded-3xl p-6 sm:p-8" delay={0.06}>
        <div className="grid gap-8 lg:grid-cols-[280px_1fr_320px]">
          <div className="flex flex-col items-center lg:items-start">
            <div className="relative mb-4 h-48 w-48 overflow-hidden rounded-3xl border-4 border-white shadow-2xl">
              {tutor.photoUrl ? (
                <img
                  src={tutor.photoUrl.startsWith('http') ? tutor.photoUrl : resolvePublicAssetUrl(tutor.photoUrl, 'profiles')}
                  alt={tutor.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-cyan-400 text-5xl font-bold text-white">
                  {tutor.initials}
                </div>
              )}
            </div>
            <div className="mt-2 text-center lg:text-left">
              <StarRating rating={avgRating} />
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {avgRating > 0 ? `${avgRating.toFixed(1)} · ` : ''}{reviewCount} review{reviewCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div>
            <h1 className="font-heading text-4xl font-extrabold text-slate-900 sm:text-5xl">{tutor.name}</h1>
            <p className="mt-2 text-xl font-medium text-indigo-600">{tutor.subject} Specialist</p>

            {tutor.expertise || tutor.methodology ? (
              <div className="mt-4">
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">About</p>
                <p className="mt-1 leading-relaxed text-slate-600">
                  {tutor.expertise} {tutor.methodology}
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {tutor.subjects.map((topic) => (
                <span key={topic} className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm">
                  {topic}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
              {tutor.teachingMode && <span>📍 {tutor.teachingMode}</span>}
              {tutor.experience && <span>🎓 {tutor.experience} exp.</span>}
              {tutor.location && <span>📌 {tutor.location}</span>}
            </div>
          </div>

          <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-xl backdrop-blur-md lg:sticky lg:top-6">
            <div className="mb-6">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Investment</p>
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-4xl font-black text-slate-900">${sessionRate}</span>
                <span className="text-lg font-bold text-slate-500">/hr</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleBook}
                className="glow-button flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95"
              >
                Reserve a Session
              </button>
              <Link
                to={tutor.authUserId ? `/chat?partner=${encodeURIComponent(tutor.authUserId)}` : '/chat'}
                className="mh-btn-secondary block w-full rounded-2xl border-2 px-4 py-4 text-center text-sm font-bold transition-all hover:border-indigo-400"
              >
                Message Tutor
              </Link>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase">Availability</p>
              <p className="mt-1 text-sm font-bold text-emerald-600">Available this week</p>
            </div>
          </aside>
        </div>
      </AnimatedSection>

      {/* Reviews Section */}
      <AnimatedSection className="glass-panel rounded-3xl p-6" delay={0.18}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-slate-900">Student Reviews</h2>
            {reviewCount > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <StarRating rating={avgRating} />
                <p className="text-sm font-bold text-slate-600">{avgRating.toFixed(1)} out of 5 · {reviewCount} review{reviewCount !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </div>

        <PublicReviewsList reviews={reviews} />
      </AnimatedSection>
    </div>
  );
}

export default TutorProfile;
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import TutorCard from '../../components/TutorCard/TutorCard.jsx';
import AnimatedSection from '../../components/ui/AnimatedSection.jsx';
import HeroSection from '../../components/HeroSection/HeroSection.jsx';
import SkeletonCard from '../../components/ui/SkeletonCard.jsx';
import { fetchApprovedTutors } from '../../services/authApi.js';
import { mapApprovedTutorToCardModel } from '../../utils/approvedTutorMapper.js';

const MotionDiv = motion.div;

function HomePage() {
  const [tutors, setTutors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadApprovedTutors = async () => {
      try {
        const result = await fetchApprovedTutors();
        if (!active) {
          return;
        }

        const mapped = Array.isArray(result)
          ? result.map(mapApprovedTutorToCardModel)
          : [];
        setTutors(mapped);
      } catch {
        if (active) {
          toast.error('Failed to load approved tutors');
          setTutors([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadApprovedTutors();
    return () => {
      active = false;
    };
  }, []);

  const featuredTutors = useMemo(() => tutors.slice(0, 6), [tutors]);

  const cardContainerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardItemVariants = {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.52,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <div className="space-y-16 pb-12">
      <HeroSection />

      <AnimatedSection className="space-y-5" delay={0.14}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-3xl font-bold text-slate-900">Meet Your Future Tutors</h2>
            <p className="mt-1 text-slate-600">Explore real tutor profiles, compare expertise and ratings, and open booking in one click.</p>
          </div>
          <Link
            to="/tutors"
            className="rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
          >
            Browse All Tutors
          </Link>
        </div>

        <MotionDiv
          variants={cardContainerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={`home-skeleton-${index}`} />)
            : featuredTutors.map((tutor) => (
                <MotionDiv key={tutor.id} variants={cardItemVariants}>
                  <TutorCard tutor={tutor} />
                </MotionDiv>
              ))}
        </MotionDiv>
        {!isLoading && featuredTutors.length === 0 ? (
          <div className="glass-panel rounded-3xl p-6 text-center">
            <p className="font-heading text-xl font-bold text-slate-900">No approved tutors available yet</p>
            <p className="mt-2 text-sm text-slate-600">Approved tutors will appear here as soon as super admin verifies them.</p>
          </div>
        ) : null}
      </AnimatedSection>
    </div>
  );
}

export default HomePage;
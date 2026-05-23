import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import TutorCard from '../../components/TutorCard/TutorCard.jsx';
import AnimatedSection from '../../components/ui/AnimatedSection.jsx';
import SkeletonCard from '../../components/ui/SkeletonCard.jsx';
import { fetchApprovedTutors } from '../../services/authApi.js';
import { mapApprovedTutorToCardModel } from '../../utils/approvedTutorMapper.js';

const allAvailability = ['All', 'Available Now', 'Busy'];
const MotionDiv = motion.div;

const trustSignals = [
  { label: 'Verified Profiles', value: '100%' },
  { label: 'Avg. Response Time', value: '< 10 min' },
  { label: 'Secure Booking', value: 'Protected' },
];

function TutorDiscovery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [subject, setSubject] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [availability, setAvailability] = useState('All');
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

  const allSubjects = useMemo(() => {
    return ['All', ...new Set(tutors.map((tutor) => tutor.subject).filter(Boolean))];
  }, [tutors]);

  const filteredTutors = useMemo(() => {
    return tutors.filter((tutor) => {
      const term = searchTerm.trim().toLowerCase();
      const textMatch =
        term.length === 0 ||
        tutor.name.toLowerCase().includes(term) ||
        tutor.subject.toLowerCase().includes(term) ||
        tutor.subjects.some((tag) => tag.toLowerCase().includes(term));

      const subjectMatch = subject === 'All' || tutor.subject === subject;
      const ratingMatch = tutor.rating >= minRating;
      const availabilityMatch = availability === 'All' || tutor.availability === availability;

      return textMatch && subjectMatch && ratingMatch && availabilityMatch;
    });
  }, [tutors, searchTerm, subject, minRating, availability]);

  const handleReset = () => {
    setSearchTerm('');
    setSubject('All');
    setMinRating(0);
    setAvailability('All');
    toast.success('Filters reset');
  };

  return (
    <div className="space-y-6">
      <AnimatedSection className="glass-panel rounded-3xl p-6 sm:p-8" delay={0.06}>
        <h1 className="font-heading text-3xl font-extrabold text-slate-900 sm:text-4xl">Discover Verified Tutors</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Search by subject, rating, and availability to shortlist high-quality mentors who fit your pace and goals.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {trustSignals.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="text-sm font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Try: Physics, SAT Math, Python"
              className="input-glow w-full rounded-2xl border px-4 py-3 text-sm outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</span>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="input-glow h-[50px] w-full rounded-2xl border px-4 text-sm outline-none"
            >
              {allSubjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleReset}
            className="mh-btn-secondary self-end rounded-2xl px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            Reset
          </button>
        </div>
      </AnimatedSection>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <AnimatedSection as="aside" className="glass-panel h-fit rounded-3xl p-5" delay={0.1}>
          <h2 className="font-heading text-lg font-bold text-slate-900">Filters</h2>

          <div className="mt-4 space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Minimum Rating</span>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={minRating}
                onChange={(event) => setMinRating(Number(event.target.value))}
                className="w-full accent-indigo-500"
              />
              <p className="mt-1 text-sm font-semibold text-indigo-700">{minRating.toFixed(1)} and above</p>
            </label>

            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Availability</span>
              <div className="flex flex-wrap gap-2">
                {allAvailability.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAvailability(item)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      availability === item
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'border border-slate-300 bg-white/70 text-slate-600 hover:border-indigo-300'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection as="section" className="space-y-4" delay={0.14}>
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold text-slate-900">Tutor Results</h2>
            <p className="text-sm font-semibold text-slate-500">{filteredTutors.length} matches</p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={`skeleton-${index}`} />
              ))}
            </div>
          ) : filteredTutors.length > 0 ? (
            <MotionDiv
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.07,
                  },
                },
              }}
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              {filteredTutors.map((tutor) => (
                <MotionDiv
                  key={tutor.id}
                  variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
                >
                  <TutorCard tutor={tutor} />
                </MotionDiv>
              ))}
            </MotionDiv>
          ) : (
            <div className="glass-panel rounded-3xl p-10 text-center">
              <p className="font-heading text-xl font-bold text-slate-900">No tutors matched these filters</p>
              <p className="mt-2 text-sm text-slate-600">Try reducing filters or switching subject to All.</p>
            </div>
          )}
        </AnimatedSection>
      </div>

    </div>
  );
}

export default TutorDiscovery;
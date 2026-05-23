import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaCircleCheck, FaMagnifyingGlass, FaShield, FaStar } from 'react-icons/fa6';

const MotionDiv = motion.div;
const MotionButton = motion.button;

const searchSamples = ['Calculus Tutor', 'Python Mentor', 'IELTS Speaking Coach'];

function ProductDemoMockup() {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = searchSamples[sampleIndex];
    const speed = isDeleting ? 45 : 75;

    const timer = setTimeout(() => {
      if (!isDeleting && typed.length < current.length) {
        setTyped(current.slice(0, typed.length + 1));
        return;
      }

      if (!isDeleting && typed.length === current.length) {
        setTimeout(() => setIsDeleting(true), 900);
        return;
      }

      if (isDeleting && typed.length > 0) {
        setTyped(current.slice(0, typed.length - 1));
        return;
      }

      setIsDeleting(false);
      setSampleIndex((previous) => (previous + 1) % searchSamples.length);
    }, speed);

    return () => clearTimeout(timer);
  }, [typed, isDeleting, sampleIndex]);

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="glass-panel rounded-3xl border border-white/55 bg-white/86 p-4 text-slate-700 shadow-2xl"
    >
      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <FaMagnifyingGlass className="text-sm text-slate-400" />
        <p className="text-sm font-semibold text-slate-600">
          {typed}
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-indigo-500 align-middle" />
        </p>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {['Math', '4.8+ Rating', 'Available Today'].map((chip, index) => (
          <MotionDiv
            key={chip}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              index === 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {chip}
          </MotionDiv>
        ))}
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-3">
          <img
            src="https://i.pravatar.cc/200?img=12"
            alt="Tutor"
            className="h-11 w-11 rounded-xl object-cover"
            loading="lazy"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">Alex Chen</p>
            <p className="text-xs text-slate-500">Python and ML Specialist</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">Available Now</span>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1">
            <FaStar className="text-amber-400" />
            4.8 rating
          </span>
          <span>$78/hour</span>
        </div>

        <div className="mt-3 space-y-2">
          {['Search tutor', 'Apply filters', 'Confirm booking'].map((step, index) => (
            <div key={step} className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 text-xs text-slate-600">
              <span>{step}</span>
              {index < 2 ? (
                <FaCircleCheck className="text-emerald-500" />
              ) : (
                <motion.span
                  animate={{ opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="text-indigo-600"
                >
                  In progress
                </motion.span>
              )}
            </div>
          ))}
        </div>

        <MotionButton
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white"
        >
          Confirm Session
        </MotionButton>
      </article>
    </MotionDiv>
  );
}

function HeroSection() {
  const [videoError, setVideoError] = useState(false);

  const trustMetrics = [
    { label: 'Verified Tutors', value: '2,400+' },
    { label: 'Sessions Delivered', value: '120k+' },
    { label: 'Average Tutor Rating', value: '4.8/5' },
  ];

  return (
    <section className="relative isolate min-h-[88vh] overflow-hidden rounded-[2rem] px-4 py-10 text-white lg:px-8 lg:py-14">
      <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED] via-[#2563EB] to-[#1D4ED8]" />
      <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-[#A855F7]/60 blur-[120px]" />
      <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-[#22D3EE]/50 blur-[140px]" />
      <div className="absolute bottom-4 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#60A5FA]/40 blur-[160px]" />

      <MotionDiv
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[10%] top-[18%] h-20 w-20 rounded-full bg-white/15"
      />
      <MotionDiv
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-[16%] top-[30%] h-12 w-12 rounded-full bg-cyan-200/35"
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid items-center gap-8 lg:grid-cols-[1.04fr_0.96fr]">
          <div>
            <MotionDiv
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-4 py-1 text-sm font-semibold"
            >
              <FaShield className="text-xs" />
              Trusted Learning Marketplace
            </MotionDiv>

            <MotionDiv
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="font-heading mt-4 text-[2.5rem] font-bold leading-[1.05] md:text-[3.25rem] xl:text-[4rem]">
                Find Your Perfect Tutor Instantly
              </h1>
              <p className="font-body mt-4 max-w-xl text-base font-medium leading-relaxed text-white/85 md:text-lg">
                Connect with expert tutors for every subject, anytime, with smart search, precise filters, and seamless booking.
              </p>
            </MotionDiv>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth?mode=register">
                <MotionButton
                  whileHover={{ scale: 1.05, boxShadow: '0px 20px 45px rgba(34, 211, 238, 0.5)' }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-6 py-3 font-semibold text-white shadow-lg"
                >
                  Get Started
                </MotionButton>
              </Link>
              <Link to="/tutors">
                <MotionButton
                  whileHover={{ scale: 1.05, boxShadow: '0px 20px 45px rgba(167, 139, 250, 0.5)' }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-lg border border-white/45 bg-white/15 px-6 py-3 font-semibold text-white shadow-lg backdrop-blur-sm"
                >
                  Browse Tutors
                </MotionButton>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <ProductDemoMockup />

            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.5 }}
              className="glass-panel overflow-hidden rounded-3xl border border-white/55 bg-white/86 p-3"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tutor-Student Session Clip</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live style
                </span>
              </div>

              {videoError ? (
                <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-sm font-semibold text-slate-500">
                  Video preview unavailable. Replace with your studio clip.
                </div>
              ) : (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
                  onError={() => setVideoError(true)}
                  className="h-40 w-full rounded-2xl object-cover"
                  poster="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1280&q=80"
                >
                  <source src="https://cdn.coverr.co/videos/coverr-students-working-on-laptops-1579/1080p.mp4" type="video/mp4" />
                </video>
              )}
            </MotionDiv>
          </div>
        </div>

        <MotionDiv
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55 }}
          className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {trustMetrics.map((metric) => (
              <div key={metric.label} className="glass-panel rounded-2xl border border-white/50 bg-white/86 p-4 text-slate-700">
                <p className="font-heading text-2xl font-bold text-slate-900">{metric.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
              </div>
            ))}
          </div>

          <article className="glass-panel rounded-2xl border border-white/50 bg-white/88 p-4 text-slate-700">
            <div className="flex items-start gap-3">
              <img
                src="https://i.pravatar.cc/200?img=25"
                alt="Student testimonial"
                className="h-12 w-12 rounded-xl object-cover"
                loading="lazy"
              />
              <div>
                <p className="font-semibold text-slate-900">Aisha Malik</p>
                <p className="text-xs text-slate-500">GRE Student</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  I found the exact tutor I needed in one search, booked in minutes, and improved my quant score within three weeks.
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                    <FaCircleCheck /> Verified Review
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                    <FaStar /> 5.0
                  </span>
                </div>
              </div>
            </div>
          </article>
        </MotionDiv>
      </div>
    </section>
  );
}

export default HeroSection;
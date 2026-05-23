import React from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import { FaRegClock } from 'react-icons/fa';
import { FaCircleCheck } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import StarRating from '../StarRating/StarRating.jsx';
import { resolvePublicAssetUrl } from '../../utils/urls.js';

const MotionArticle = motion.article;
const MotionDiv = motion.div;

function TutorCard({ tutor }) {
  const navigate = useNavigate();
  const [photoFailed, setPhotoFailed] = React.useState(false);

  const {
    id,
    name,
    subject,
    subjects = [],
    expertise,
    rating,
    fee,
    availability,
    sessions,
    photoUrl,
  } = tutor;

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const smoothRotateX = useSpring(rotateX, { stiffness: 170, damping: 17 });
  const smoothRotateY = useSpring(rotateY, { stiffness: 170, damping: 17 });

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const yPct = y / rect.height;
    const xPct = x / rect.width;

    rotateX.set((0.5 - yPct) * 8);
    rotateY.set((xPct - 0.5) * 10);
  };

  const resetTilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  const availabilityClass =
    availability === 'Available Now'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-rose-100 text-rose-700';

  const handleCardClick = () => {
    navigate(`/profile/${id}`);
  };


  return (
    <>
      <MotionArticle
        onMouseMove={handlePointerMove}
        onMouseLeave={resetTilt}
        onClick={handleCardClick}

        style={{
          rotateX: smoothRotateX,
          rotateY: smoothRotateY,
          transformPerspective: 1000,
        }}
        whileHover={{ y: -10, scale: 1.02, boxShadow: '0 24px 50px rgba(79, 70, 229, 0.28)' }}
        className="glass-panel group relative flex h-full cursor-pointer flex-col rounded-3xl p-4"
      >
        <div className="relative mb-4 h-44 overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-indigo-100 to-violet-100">
          {!photoFailed && photoUrl ? (
            <img
              src={photoUrl.startsWith('http') ? photoUrl : resolvePublicAssetUrl(photoUrl, 'profiles')}
              alt={`${name} profile`}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <span className="font-heading text-4xl font-black">{tutor.initials || name?.charAt(0) || 'T'}</span>
              <span className="mt-1 text-xs font-semibold opacity-80">Verified Tutor</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />

          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/95">
            <FaCircleCheck className="text-[10px]" />
            Verified Tutor
          </div>

          <div className="absolute bottom-3 left-3 right-3 translate-y-2 rounded-xl border border-white/55 bg-white/90 p-3 opacity-0 shadow-xl transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="flex items-center justify-between gap-3">
              <p className="font-heading text-sm font-bold text-slate-900">{name}</p>
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${availabilityClass}`}>
                {availability}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">{subjects.slice(0, 2).join(' • ')}</p>
            <div className="mt-1">
              <StarRating rating={rating} />
            </div>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-bold text-slate-900">{name}</h3>
            <p className="text-sm font-medium text-slate-500">{subject} Specialist</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${availabilityClass}`}>
            {availability}
          </span>
        </div>

        <div className="mb-2">
          <StarRating rating={rating} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {subjects.slice(0, 3).map((topic) => (
            <span
              key={`${id}-${topic}`}
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
            >
              {topic}
            </span>
          ))}
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{expertise}</p>

        <div className="mt-auto border-t border-slate-200/80 pt-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <p className="font-semibold text-slate-900">
              ${fee}
              <span className="font-medium text-slate-500">/hour</span>
            </p>
            <p className="flex items-center gap-1 text-slate-500">
              <FaRegClock />
              {sessions}+ sessions
            </p>
          </div>

          <button
            type="button"
            className="glow-button w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white"
          >
            Open Booking
          </button>
        </div>
      </MotionArticle>
    </>
  );
}

export default TutorCard;
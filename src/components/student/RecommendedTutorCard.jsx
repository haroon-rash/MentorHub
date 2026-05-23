import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, Star, ArrowRight } from 'lucide-react';
import { resolvePublicAssetUrl } from '../../utils/urls.js';

export default function RecommendedTutorCard({ tutor, onView, rank }) {
  const [photoFailed, setPhotoFailed] = React.useState(false);
  const photo = tutor.profilePhotoUrl;
  const subjects = tutor.subjects || [];
  const reasons = tutor.matchReasons || [];

  const handleClick = () => {
    onView?.(tutor);
  };

  return (
    <motion.article
      layout
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative flex h-full min-w-[280px] max-w-[320px] flex-col overflow-hidden rounded-2xl border border-[var(--mh-border)] bg-[var(--mh-bg-elevated)] shadow-lg shadow-indigo-500/5"
    >
      {rank != null && rank <= 3 ? (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-indigo-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          <Sparkles size={12} />
          #{rank}
        </span>
      ) : null}

      <div className="relative h-36 bg-gradient-to-br from-indigo-600/30 to-violet-600/20">
        {!photoFailed && photo ? (
          <img
            src={photo.startsWith('http') ? photo : resolvePublicAssetUrl(photo, 'profiles')}
            alt={tutor.fullName}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <motion.div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600">
            <span className="font-heading text-4xl font-black text-white">
              {(tutor.fullName || 'T').split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </span>
          </motion.div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--mh-bg-elevated)] via-transparent to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-heading text-lg font-bold text-[var(--mh-text)] line-clamp-1">{tutor.fullName}</h3>
            <p className="text-xs font-medium text-indigo-400">{tutor.primarySubject} specialist</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1 text-amber-200">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold">{(tutor.averageRating || 0).toFixed(1)}</span>
            {(tutor.reviewCount ?? 0) > 0 && (
              <span className="text-[10px] text-amber-300/80">({tutor.reviewCount})</span>
            )}
          </div>
        </div>

        {reasons.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {reasons.slice(0, 2).map((r) => (
              <li key={r} className="flex items-start gap-1.5 text-[11px] text-[var(--mh-text-muted)]">
                <Sparkles size={10} className="mt-0.5 shrink-0 text-indigo-400" />
                <span className="line-clamp-1">{r}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {subjects.slice(0, 3).map((s) => (
            <span key={s} className="mh-badge-indigo rounded-full px-2 py-0.5 text-[10px] font-semibold">
              {s}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <p className="text-sm font-bold text-[var(--mh-text)]">
            ${tutor.hourlyFee}
            <span className="font-normal text-[var(--mh-text-muted)]">/hr</span>
          </p>
          <Link
            to={`/profile/${tutor.tutorProfileId}`}
            onClick={handleClick}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
          >
            View
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

import React from 'react';
import { motion } from 'framer-motion';

const LABELS = {
  1: 'Poor — needs improvement',
  2: 'Fair — below expectations',
  3: 'Good — met expectations',
  4: 'Very good — above expectations',
  5: 'Excellent — outstanding',
};

export function getRatingLabel(rating) {
  return LABELS[rating] || 'Select a rating';
}

export default function InteractiveStarRating({ rating, onChange, size = 'lg', disabled = false }) {
  const sizeClass = size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-3xl' : 'text-2xl';

  return (
    <motion.div className="flex flex-col items-center gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex gap-2" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && onChange?.(n)}
            onClick={() => onChange?.(n)}
            className={`${sizeClass} transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded disabled:opacity-50`}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <span className={n <= rating ? 'text-amber-400 drop-shadow-sm' : 'text-slate-600'}>★</span>
          </button>
        ))}
      </div>
      <p className="text-center text-sm font-semibold text-amber-200/90">{getRatingLabel(rating)}</p>
    </motion.div>
  );
}

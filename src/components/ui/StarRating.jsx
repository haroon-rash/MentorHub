import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function StarRating({ value = 0, max = 5, interactive = false, onChange, size = 'md' }) {
  const [hovered, setHovered] = useState(null);
  const display = hovered ?? value;

  const sizeClass = { sm: 'text-base', md: 'text-2xl', lg: 'text-3xl' }[size] ?? 'text-2xl';

  return (
    <div className={`flex items-center gap-0.5 ${sizeClass}`} role={interactive ? 'radiogroup' : 'img'} aria-label={`Rating: ${value} out of ${max}`}>
      {[...Array(max)].map((_, i) => {
        const filled = i < display;
        return (
          <motion.button
            key={i}
            type="button"
            tabIndex={interactive ? 0 : -1}
            disabled={!interactive}
            whileHover={interactive ? { scale: 1.3 } : {}}
            whileTap={interactive ? { scale: 0.9 } : {}}
            onClick={() => interactive && onChange?.(i + 1)}
            onMouseEnter={() => interactive && setHovered(i + 1)}
            onMouseLeave={() => interactive && setHovered(null)}
            className={`transition-colors ${interactive ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}
            aria-label={`${i + 1} star${i !== 0 ? 's' : ''}`}
          >
            <span className={filled ? 'text-amber-400' : 'text-slate-200'}>★</span>
          </motion.button>
        );
      })}
    </div>
  );
}

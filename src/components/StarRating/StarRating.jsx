import React from 'react';
import { FaRegStar, FaStar, FaStarHalfAlt } from 'react-icons/fa';

function StarRating({ rating }) {
  const score = Number(rating) || 0;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        if (score >= starValue) {
          return <FaStar key={`full-${starValue}`} className="text-sm text-amber-400" />;
        }

        if (score >= starValue - 0.5) {
          return <FaStarHalfAlt key={`half-${starValue}`} className="text-sm text-amber-400" />;
        }

        return <FaRegStar key={`empty-${starValue}`} className="text-sm text-slate-300" />;
      })}
      <span className="ml-1 text-xs font-semibold text-slate-500">{score.toFixed(1)}</span>
    </div>
  );
}

export default StarRating;
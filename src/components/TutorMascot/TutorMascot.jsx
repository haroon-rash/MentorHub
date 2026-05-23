import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const MotionDiv = motion.div;
const MotionG = motion.g;

const paletteMap = {
  indigo: {
    jacket: '#334155',
    shirt: '#4f46e5',
    skin: '#f4c7a8',
    hair: '#111827',
    beard: '#1f2937',
    bulb: '#facc15',
    bubble: '#4f46e5',
  },
  cyan: {
    jacket: '#1e3a8a',
    shirt: '#0ea5e9',
    skin: '#f5ccb1',
    hair: '#0f172a',
    beard: '#1e293b',
    bulb: '#fbbf24',
    bubble: '#0ea5e9',
  },
  violet: {
    jacket: '#312e81',
    shirt: '#7c3aed',
    skin: '#f2c7aa',
    hair: '#111827',
    beard: '#1f2937',
    bulb: '#fde047',
    bubble: '#7c3aed',
  },
  emerald: {
    jacket: '#134e4a',
    shirt: '#10b981',
    skin: '#f4c9ac',
    hair: '#1f2937',
    beard: '#334155',
    bulb: '#facc15',
    bubble: '#10b981',
  },
  rose: {
    jacket: '#4c1d95',
    shirt: '#ec4899',
    skin: '#f3c5a6',
    hair: '#111827',
    beard: '#1f2937',
    bulb: '#fcd34d',
    bubble: '#ec4899',
  },
  amber: {
    jacket: '#1f2937',
    shirt: '#f59e0b',
    skin: '#f4cab0',
    hair: '#111827',
    beard: '#374151',
    bulb: '#fef08a',
    bubble: '#f59e0b',
  },
};

function TutorMascot({ className = '', mini = false, pose = 'idle', cursor = { x: 0, y: 0 }, variant = 'indigo' }) {
  const palette = useMemo(() => paletteMap[variant] || paletteMap.indigo, [variant]);

  const baseFloat = pose === 'bounce' ? [0, -8, 0] : [0, -5, 0];
  const headTilt = pose === 'point' ? 6 : pose === 'wave' ? -4 : 0;
  const rightHandWave = pose === 'wave' ? [0, 18, -14, 18, 0] : pose === 'point' ? [0, -8, 0] : [0, 0, 0];

  const cursorX = Math.max(-0.5, Math.min(0.5, cursor.x || 0));
  const cursorY = Math.max(-0.5, Math.min(0.5, cursor.y || 0));

  return (
    <MotionDiv
      animate={{ y: baseFloat }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      className={`relative ${className}`}
    >
      <svg viewBox="0 0 420 420" className="h-full w-full" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tutor mascot">
        <defs>
          <linearGradient id={`bg-${variant}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
          </linearGradient>
        </defs>

        <ellipse cx="210" cy="356" rx="108" ry="28" fill="rgba(15,23,42,0.16)" />

        <g transform={`translate(${cursorX * 10}, ${cursorY * 6})`}>
          <MotionG animate={{ rotate: rightHandWave }} transform="translate(280,182)" style={{ originX: '280px', originY: '182px' }} transition={{ duration: 1.35, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}>
            <rect x="-4" y="0" width="34" height="108" rx="16" fill={palette.skin} />
            <circle cx="13" cy="112" r="16" fill={palette.skin} />
          </MotionG>

          <rect x="112" y="152" width="34" height="112" rx="16" fill={palette.skin} />
          <circle cx="129" cy="268" r="16" fill={palette.skin} />

          <rect x="138" y="144" width="142" height="152" rx="24" fill={palette.jacket} />
          <rect x="154" y="162" width="110" height="74" rx="14" fill={palette.shirt} />

          <rect x="170" y="294" width="32" height="82" rx="9" fill="#111827" />
          <rect x="218" y="294" width="32" height="82" rx="9" fill="#111827" />

          <rect x="164" y="372" width="42" height="14" rx="6" fill="#0b1220" />
          <rect x="214" y="372" width="42" height="14" rx="6" fill="#0b1220" />

          <MotionG animate={{ x: cursorX * 10, y: cursorY * 6, rotate: headTilt + cursorX * 10 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
            <rect x="158" y="74" width="104" height="84" rx="24" fill={palette.skin} />
            <rect x="154" y="66" width="112" height="32" rx="16" fill={palette.hair} />

            <circle cx="192" cy="110" r="5" fill="#0f172a" />
            <circle cx="228" cy="110" r="5" fill="#0f172a" />

            <path d="M188 134 Q210 148 232 134" fill="none" stroke={palette.beard} strokeWidth="8" strokeLinecap="round" />
            <path d="M177 126 Q210 176 243 126" fill="none" stroke={palette.beard} strokeWidth="12" strokeLinecap="round" />
          </MotionG>

          {!mini && (
            <>
              <MotionG animate={{ y: [0, -4, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
                <line x1="309" y1="178" x2="334" y2="142" stroke="rgba(15,23,42,0.45)" strokeWidth="4" strokeLinecap="round" />
                <circle cx="338" cy="136" r="18" fill={palette.bulb} />
                <circle cx="338" cy="136" r="24" fill={palette.bulb} opacity="0.28" />
              </MotionG>

              <MotionG animate={{ x: [0, 4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
                <rect x="250" y="66" width="122" height="40" rx="14" fill={palette.bubble} opacity="0.92" />
                <rect x="258" y="74" width="88" height="8" rx="4" fill="rgba(255,255,255,0.88)" />
                <rect x="258" y="88" width="72" height="8" rx="4" fill="rgba(255,255,255,0.74)" />
              </MotionG>
            </>
          )}

          <rect x="104" y="58" width="220" height="340" rx="30" fill={`url(#bg-${variant})`} opacity="0.05" />
        </g>
      </svg>
    </MotionDiv>
  );
}

export default TutorMascot;

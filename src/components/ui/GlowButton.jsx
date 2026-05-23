import { motion } from 'framer-motion';

const MotionButton = motion.button;

function GlowButton({ className = '', children, ...props }) {
  return (
    <MotionButton
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`glow-button rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 px-5 py-3 font-semibold text-white transition-all duration-300 ${className}`}
      {...props}
    >
      {children}
    </MotionButton>
  );
}

export default GlowButton;

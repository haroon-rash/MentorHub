import { motion } from 'framer-motion';

const sectionVariants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.58,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function AnimatedSection({
  as = 'section',
  className = '',
  children,
  delay = 0,
  amount = 0.2,
  once = true,
  immediate = false,
}) {
  const MotionTag = motion[as] || motion.section;

  return (
    <MotionTag
      className={className}
      variants={sectionVariants}
      initial="hidden"
      animate={immediate ? 'visible' : undefined}
      whileInView={immediate ? undefined : 'visible'}
      viewport={immediate ? undefined : { once, amount }}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}

export default AnimatedSection;

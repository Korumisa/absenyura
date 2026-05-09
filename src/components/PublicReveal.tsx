import React from 'react';
import { motion } from 'framer-motion';

export default function PublicReveal({
  children,
  className,
  delay = 0,
  shiftY = 18,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  shiftY?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={shiftY ? { opacity: 0, y: shiftY } : { opacity: 0 }}
      whileInView={shiftY ? { opacity: 1, y: 0 } : { opacity: 1 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}

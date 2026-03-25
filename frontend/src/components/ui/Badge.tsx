import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export default function Badge({ children, className = '' }: BadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/5 text-sm font-sans font-medium text-accent-glow tracking-wide ${className}`}
    >
      {children}
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'white';
  size?: 'sm' | 'md' | 'lg';
  arrow?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  href?: string;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  arrow = false,
  loading = false,
  onClick,
  className = '',
  href,
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-xl transition-all duration-200 relative overflow-hidden';

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  const variantClasses = {
    primary: 'bg-accent text-white hover:bg-accent-glow shadow-[0_0_24px_rgba(108,71,255,0.25)] hover:shadow-[0_0_32px_rgba(108,71,255,0.4)]',
    ghost: 'bg-transparent text-prose border border-border hover:border-accent/50 hover:text-white',
    white: 'bg-white text-base hover:bg-white/90 shadow-[0_0_24px_rgba(240,240,255,0.15)]',
  };

  const content = (
    <>
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      <span>{children}</span>
      {arrow && !loading && (
        <motion.span
          className="inline-block"
          initial={{ x: 0 }}
          whileHover={{ x: 4 }}
        >
          <ArrowRight className="w-4 h-4" />
        </motion.span>
      )}
    </>
  );

  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  if (href) {
    return (
      <motion.a
        href={href}
        className={classes}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      className={classes}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={loading}
    >
      {content}
    </motion.button>
  );
}

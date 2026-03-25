interface GlowEffectProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function GlowEffect({ className = '', size = 'lg' }: GlowEffectProps) {
  const sizeClasses = {
    sm: 'w-48 h-48',
    md: 'w-72 h-72',
    lg: 'w-96 h-96',
    xl: 'w-[600px] h-[600px]',
  };

  return (
    <div
      className={`absolute rounded-full bg-accent/20 blur-[120px] pointer-events-none ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    />
  );
}

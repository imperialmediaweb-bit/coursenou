const SEGMENTS = [
  { name: 'Universities', weight: 'font-bold', size: 'text-lg sm:text-xl' },
  { name: 'Online Schools', weight: 'font-semibold', size: 'text-lg sm:text-xl' },
  { name: 'Corporate Training', weight: 'font-bold', size: 'text-lg sm:text-xl' },
  { name: 'EdTech Companies', weight: 'font-medium', size: 'text-xl sm:text-2xl' },
  { name: 'Language Schools', weight: 'font-semibold', size: 'text-lg sm:text-xl' },
  { name: 'Coaching Platforms', weight: 'font-bold', size: 'text-lg sm:text-xl' },
  { name: 'Bootcamps', weight: 'font-black', size: 'text-xl sm:text-2xl' },
  { name: 'Nonprofits', weight: 'font-medium', size: 'text-xl sm:text-2xl' },
];

// Double for seamless marquee loop
const MARQUEE_ITEMS = [...SEGMENTS, ...SEGMENTS];

export default function LogoBar() {
  return (
    <section className="py-12 sm:py-16 border-y border-border/30 bg-base overflow-hidden">
      <p className="text-xs sm:text-sm text-muted uppercase tracking-widest font-sans text-center mb-6 sm:mb-8 px-4">
        Built for educators at
      </p>

      <div className="relative group">
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-base to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-base to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee group-hover:[animation-play-state:paused] w-max">
          {MARQUEE_ITEMS.map((segment, i) => (
            <div
              key={`${segment.name}-${i}`}
              className="flex items-center justify-center px-6 sm:px-10 lg:px-12 shrink-0"
            >
              <span
                className={`font-sans ${segment.weight} ${segment.size} text-muted/60 select-none whitespace-nowrap transition-colors duration-300 group-hover:text-muted/80`}
              >
                {segment.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

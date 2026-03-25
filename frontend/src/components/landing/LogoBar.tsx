const LOGOS = [
  { name: 'Stanford', weight: 'font-bold', size: 'text-lg sm:text-xl' },
  { name: 'MIT', weight: 'font-black', size: 'text-xl sm:text-2xl' },
  { name: 'Coursera', weight: 'font-semibold', size: 'text-lg sm:text-xl' },
  { name: 'Udemy', weight: 'font-bold', size: 'text-lg sm:text-xl' },
  { name: 'Google', weight: 'font-medium', size: 'text-xl sm:text-2xl' },
  { name: 'Microsoft', weight: 'font-semibold', size: 'text-lg sm:text-xl' },
  { name: 'Harvard', weight: 'font-bold', size: 'text-lg sm:text-xl' },
  { name: 'Oxford', weight: 'font-medium', size: 'text-xl sm:text-2xl' },
];

// Double for seamless marquee loop
const MARQUEE_ITEMS = [...LOGOS, ...LOGOS];

export default function LogoBar() {
  return (
    <section className="py-12 sm:py-16 border-y border-border/30 bg-base overflow-hidden">
      <p className="text-xs sm:text-sm text-muted uppercase tracking-widest font-sans text-center mb-6 sm:mb-8 px-4">
        Trusted by educators from
      </p>

      <div className="relative group">
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-base to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-16 sm:w-24 bg-gradient-to-l from-base to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee group-hover:[animation-play-state:paused] w-max">
          {MARQUEE_ITEMS.map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className="flex items-center justify-center px-6 sm:px-10 lg:px-12 shrink-0"
            >
              <span
                className={`font-sans ${logo.weight} ${logo.size} text-muted/60 select-none whitespace-nowrap transition-colors duration-300 group-hover:text-muted/80`}
              >
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

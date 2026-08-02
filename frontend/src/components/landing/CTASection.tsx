import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import Button from '../ui/Button';

function GlowEffect() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div className="w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full bg-accent/15 blur-[120px] sm:blur-[160px]" />
    </div>
  );
}

const stagger = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const, delay } },
});

export default function CTASection() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-base to-accent/10" />

      <GlowEffect />

      <div
        ref={ref}
        className="relative z-10 max-w-3xl mx-auto text-center px-4"
      >
        <motion.h2
          {...stagger(0)}
          animate={inView ? stagger(0).animate : stagger(0).initial}
          className="text-3xl sm:text-4xl lg:text-6xl font-display font-bold text-white"
        >
          Start creating with AI today.
        </motion.h2>

        <motion.p
          {...stagger(0.1)}
          animate={inView ? stagger(0.1).animate : stagger(0.1).initial}
          className="text-lg text-prose mt-6 mb-10"
        >
          Join thousands of educators. Generate your first course in 60 seconds.
        </motion.p>

        <motion.div
          {...stagger(0.2)}
          animate={inView ? stagger(0.2).animate : stagger(0.2).initial}
        >
          <Button variant="white" size="lg" arrow href="/register">
            Get Started Free — No credit card required
          </Button>
        </motion.div>

        <motion.div
          {...stagger(0.3)}
          animate={inView ? stagger(0.3).animate : stagger(0.3).initial}
          className="flex items-center justify-center gap-4 mt-8"
        >
          <span className="text-xs text-muted font-sans">23 languages</span>
          <span className="w-1 h-1 rounded-full bg-muted" />
          <span className="text-xs text-muted font-sans">PDF &amp; PowerPoint</span>
          <span className="w-1 h-1 rounded-full bg-muted" />
          <span className="text-xs text-muted font-sans">Quizzes</span>
          <span className="w-1 h-1 rounded-full bg-muted" />
          <span className="text-xs text-muted font-sans">Certificates</span>
        </motion.div>
      </div>
    </section>
  );
}

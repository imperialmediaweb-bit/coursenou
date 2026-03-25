import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, BookOpen, CheckCircle2, Star } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import Button from '../ui/Button';

const COURSE_TITLE = 'Introduction to Machine Learning';
const TOPICS = [
  'Supervised vs Unsupervised Learning',
  'Neural Network Fundamentals',
  'Training & Evaluation Methods',
  'Real-World Applications',
];

function MockCourseCard() {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.3 });
  const [typedTitle, setTypedTitle] = useState('');
  const [visibleTopics, setVisibleTopics] = useState(0);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (!inView) return;

    let charIndex = 0;
    const typeInterval = setInterval(() => {
      charIndex++;
      setTypedTitle(COURSE_TITLE.slice(0, charIndex));
      if (charIndex >= COURSE_TITLE.length) {
        clearInterval(typeInterval);
        // Start showing topics after title is typed
        let topicIndex = 0;
        const topicInterval = setInterval(() => {
          topicIndex++;
          setVisibleTopics(topicIndex);
          if (topicIndex >= TOPICS.length) {
            clearInterval(topicInterval);
            setShowProgress(true);
          }
        }, 400);
      }
    }, 45);

    return () => clearInterval(typeInterval);
  }, [inView]);

  return (
    <div ref={ref} className="animate-float">
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl shadow-accent/5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <span className="text-xs font-sans text-muted uppercase tracking-wider">
            AI Generating...
          </span>
        </div>

        {/* Course Title */}
        <div className="mb-4 min-h-[2rem]">
          <h4 className="text-base sm:text-lg font-sans font-semibold text-white">
            {typedTitle}
            {typedTitle.length < COURSE_TITLE.length && (
              <span className="inline-block w-0.5 h-5 bg-accent ml-0.5 animate-typing-cursor align-middle" />
            )}
          </h4>
        </div>

        {/* Topics */}
        <div className="space-y-2.5 mb-5">
          {TOPICS.map((topic, i) => (
            <div
              key={topic}
              className={`flex items-center gap-2.5 transition-all duration-300 ${
                i < visibleTopics
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-2'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <span className="text-sm font-sans text-prose">{topic}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-sans">
            <span className="text-muted">Generation progress</span>
            <span className="text-accent-glow">78%</span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-accent to-accent-glow rounded-full ${
                showProgress ? 'animate-progress-fill' : 'w-0'
              }`}
            />
          </div>
        </div>

        {/* Bottom modules count */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
          <BookOpen className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs font-sans text-muted">
            12 modules &middot; 48 lessons &middot; 6 quizzes
          </span>
        </div>
      </div>
    </div>
  );
}

function GlowEffect() {
  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div className="w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full bg-accent/10 blur-[120px] sm:blur-[160px] animate-pulse-glow" />
    </div>
  );
}

const AVATARS = [
  { initials: 'JK', color: 'bg-accent' },
  { initials: 'SR', color: 'bg-emerald-500' },
  { initials: 'AM', color: 'bg-rose-500' },
  { initials: 'TW', color: 'bg-amber-500' },
  { initials: 'LP', color: 'bg-cyan-500' },
];

const stagger = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const, delay } },
});

const mockCardVariants = {
  initial: { opacity: 0, x: 60, y: 20 },
  animate: { opacity: 1, x: 0, y: 0, transition: { duration: 0.8, ease: "easeOut" as const, delay: 0.5 } },
};

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-base">
      <GlowEffect />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-32 sm:pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left content */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Badge */}
            <motion.div {...stagger(0)}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-border text-xs sm:text-sm font-sans text-prose mb-6 sm:mb-8">
                <span className="text-accent">&#10022;</span>
                Powered by Gemini &amp; GPT-4o
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              {...stagger(0.1)}
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-display italic text-white leading-[1.08] tracking-tight mb-5 sm:mb-6"
            >
              Generate complete
              <br />
              <span className="bg-gradient-to-r from-accent to-accent-glow bg-clip-text text-transparent">
                AI courses
              </span>
              <br />
              in minutes, not months.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              {...stagger(0.2)}
              className="text-base sm:text-lg font-sans text-prose max-w-xl lg:max-w-2xl mb-8 sm:mb-10 leading-relaxed"
            >
              Coursbit transforms your ideas into structured, engaging courses
              with AI-generated lessons, quizzes, and multimedia -- ready to
              publish and share in minutes.
            </motion.p>

            {/* CTAs */}
            <motion.div
              {...stagger(0.3)}
              className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-10 sm:mb-12 w-full sm:w-auto"
            >
              <Button variant="primary" size="lg" arrow href="/register">
                Start for Free
              </Button>
              <Button variant="ghost" size="lg" href="#how-it-works">
                See how it works
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.div
              {...stagger(0.4)}
              className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
            >
              {/* Avatar stack */}
              <div className="flex items-center -space-x-2.5">
                {AVATARS.map((av) => (
                  <div
                    key={av.initials}
                    className={`w-9 h-9 rounded-full ${av.color} flex items-center justify-center text-xs font-sans font-bold text-white ring-2 ring-base`}
                  >
                    {av.initials}
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center sm:items-start gap-0.5">
                <span className="text-sm font-sans text-white font-medium">
                  Joined by 2,400+ creators
                </span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                  <span className="text-xs font-sans text-muted ml-1">
                    4.9/5
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Mock UI card */}
          <motion.div
            {...mockCardVariants}
            className="flex justify-center lg:justify-end mt-8 lg:mt-0"
          >
            <MockCourseCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

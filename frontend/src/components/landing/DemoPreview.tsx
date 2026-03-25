import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

const topics = [
  'Introduction to Machine Learning',
  'Supervised Learning',
  'Neural Networks',
  'Deep Learning',
  'Practical Applications',
];

const topicVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.4 + i * 0.1,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

const lineVariants = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: (i: number) => ({
    opacity: 1,
    scaleX: 1,
    transition: {
      delay: 0.8 + i * 0.12,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

export default function DemoPreview() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <section className="py-24 lg:py-32 bg-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white text-center mb-16"
        >
          See Coursbit in action
        </motion.h2>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-4xl mx-auto bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Top bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <span className="w-3 h-3 rounded-full bg-[#28C840]" />
            </div>
            <span className="text-sm text-muted ml-2 font-sans">
              Course Generator
            </span>
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row">
            {/* Sidebar — horizontal scroll on mobile, vertical on md+ */}
            <div className="w-full md:w-64 flex-shrink-0 bg-base/50 border-b md:border-b-0 md:border-r border-border p-4">
              <span className="text-xs text-muted uppercase tracking-wider font-sans font-medium">
                Topics
              </span>

              {/* Mobile: horizontal scroll, Desktop: vertical list */}
              <div className="flex md:flex-col gap-1.5 mt-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 -mx-1 px-1 scrollbar-hide">
                {topics.map((topic, i) => (
                  <motion.div
                    key={topic}
                    custom={i}
                    initial="hidden"
                    animate={inView ? 'visible' : 'hidden'}
                    variants={topicVariants}
                    className={`px-3 py-2 rounded-lg text-sm font-sans whitespace-nowrap md:whitespace-normal flex-shrink-0 ${
                      i === 0
                        ? 'bg-accent/10 text-accent border-l-2 border-accent'
                        : 'text-prose hover:bg-white/[0.03]'
                    } transition-colors`}
                  >
                    {topic}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <span className="text-xs text-muted uppercase tracking-wider font-sans font-medium">
                  Lesson Content
                </span>

                <h3 className="text-xl font-sans font-semibold text-white mb-4 mt-2">
                  Introduction to Machine Learning
                </h3>

                {/* Fake text lines */}
                <div className="space-y-3">
                  {[
                    { width: 'w-full' },
                    { width: 'w-4/5' },
                    { width: 'w-3/5' },
                  ].map((line, i) => (
                    <motion.div
                      key={i}
                      custom={i}
                      initial="hidden"
                      animate={inView ? 'visible' : 'hidden'}
                      variants={lineVariants}
                      className={`${line.width} h-3 bg-muted/20 rounded-full origin-left`}
                    />
                  ))}
                </div>

                {/* More fake content block */}
                <div className="mt-6 space-y-3">
                  {[
                    { width: 'w-full' },
                    { width: 'w-11/12' },
                    { width: 'w-2/3' },
                  ].map((line, i) => (
                    <motion.div
                      key={`b-${i}`}
                      custom={i + 3}
                      initial="hidden"
                      animate={inView ? 'visible' : 'hidden'}
                      variants={lineVariants}
                      className={`${line.width} h-3 bg-muted/20 rounded-full origin-left`}
                    />
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted font-sans">
                      Course Progress
                    </span>
                    <span className="text-xs text-accent font-sans">78%</span>
                  </div>
                  <div className="bg-border rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={inView ? { width: '78%' } : { width: 0 }}
                      transition={{
                        delay: 1.2,
                        duration: 1.5,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="bg-accent rounded-full h-2"
                    />
                  </div>
                </div>

                {/* Generate Quiz button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ delay: 1.6, duration: 0.4 }}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-glow text-white text-sm font-sans font-medium rounded-xl transition-colors shadow-[0_0_20px_rgba(108,71,255,0.3)] animate-pulse-glow"
                >
                  <Play className="w-4 h-4" />
                  Generate Quiz
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

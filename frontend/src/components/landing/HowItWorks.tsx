import { motion } from 'framer-motion';
import { MessageSquare, Sparkles, Share2, type LucideIcon } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    number: '01',
    icon: MessageSquare,
    title: 'Enter your topic',
    description:
      'Type any subject. Add subtopics or let AI decide. Choose your language from 23 options.',
  },
  {
    number: '02',
    icon: Sparkles,
    title: 'AI generates everything',
    description:
      'Gemini or GPT-4o creates a full structured course: theory, images, video links, and a complete quiz.',
  },
  {
    number: '03',
    icon: Share2,
    title: 'Share, export, earn',
    description:
      'Download PDF or PPT. Share a link. Listen as audio. Earn a certificate.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

export default function HowItWorks() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white text-center mb-16 lg:mb-20"
        >
          From idea to full course in 3 steps
        </motion.h2>

        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                custom={i}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                variants={cardVariants}
                whileHover={{ y: -4, borderColor: 'rgba(108, 71, 255, 0.4)' }}
                transition={{ duration: 0.25 }}
                className="bg-surface border border-border rounded-2xl p-8 relative overflow-hidden group cursor-default"
              >
                {/* Background step number */}
                <span className="text-[120px] lg:text-[160px] font-display font-bold text-accent/5 absolute -top-6 -right-2 leading-none select-none pointer-events-none">
                  {step.number}
                </span>

                {/* Icon */}
                <div className="relative z-10 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-accent" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="relative z-10 text-xl font-sans font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="relative z-10 text-prose text-sm leading-relaxed">
                  {step.description}
                </p>

                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-accent/[0.03] to-transparent" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

/**
 * What the platform does, rather than which suppliers sit behind it.
 *
 * This section used to name Gemini, GPT-4o and Claude with their logos, and
 * closed with "switch between providers instantly from your settings" — which
 * is no longer true, since the model is an operator setting rather than a user
 * preference. Naming the suppliers also invited the reader to see the product
 * as a thin wrapper over them.
 */

interface Capability {
  title: string;
  gradientFrom: string;
  gradientTo: string;
  subtitle: string;
  features: string[];
}

const capabilities: Capability[] = [
  {
    title: 'Complete courses',
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-cyan-400',
    subtitle: 'Not an outline — the whole thing',
    features: [
      'Structured modules and lessons',
      'Worked examples and code',
      'Illustrations for every lesson',
      'Ready to read or hand out',
    ],
  },
  {
    title: '23 languages',
    gradientFrom: 'from-green-400',
    gradientTo: 'to-emerald-400',
    subtitle: 'Written natively, not translated',
    features: [
      'European, Asian and Middle Eastern',
      'Course, quiz and certificate alike',
      'Correct accents throughout',
      'One click at creation',
    ],
  },
  {
    title: 'Built to keep going',
    gradientFrom: 'from-orange-400',
    gradientTo: 'to-amber-400',
    subtitle: 'One model failing is not your problem',
    features: [
      'Several models behind the scenes',
      'Falls back automatically',
      'Each lesson written on its own',
      'A slow answer never loses your work',
    ],
  },
];

const cardVariants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction * 60,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.7,
      ease: 'easeOut',
    },
  },
} as const;

export default function AIProviders() {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <section className="py-24 lg:py-32 bg-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white text-center mb-16"
        >
          Built for courses people actually finish
        </motion.h2>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {capabilities.map((capability, i) => (
            <motion.div
              key={capability.title}
              custom={i === 0 ? -1 : 1}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={cardVariants}
              whileHover={{
                borderColor: 'rgba(108, 71, 255, 0.3)',
                boxShadow: '0 0 30px rgba(108, 71, 255, 0.08)',
              }}
              transition={{ duration: 0.25 }}
              className="bg-surface border border-border rounded-2xl p-8 group cursor-default"
            >
              <h3
                className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${capability.gradientFrom} ${capability.gradientTo} bg-clip-text text-transparent mb-1`}
              >
                {capability.title}
              </h3>

              <p className="text-prose text-sm mb-6">{capability.subtitle}</p>

              <ul className="space-y-3">
                {capability.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    <span className="text-sm text-prose">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-sm text-muted mt-8"
        >
          Type a subject, review the outline, and the course writes itself.
        </motion.p>
      </div>
    </section>
  );
}

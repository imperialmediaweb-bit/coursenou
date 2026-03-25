import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface ProviderCard {
  name: string;
  gradientFrom: string;
  gradientTo: string;
  subtitle: string;
  features: string[];
}

const providers: ProviderCard[] = [
  {
    name: 'Gemini',
    gradientFrom: 'from-blue-400',
    gradientTo: 'to-cyan-400',
    subtitle: "Google's most capable AI",
    features: [
      'Free to use',
      '23 languages supported',
      'Fast generation speed',
      'Multimodal capabilities',
    ],
  },
  {
    name: 'GPT-4o',
    gradientFrom: 'from-green-400',
    gradientTo: 'to-emerald-400',
    subtitle: "OpenAI's flagship model",
    features: [
      'Highest content quality',
      'Detailed explanations',
      'Advanced reasoning',
      'Perfect for pro users',
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
      ease: "easeOut",
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
          Powered by the best AI in the world
        </motion.h2>

        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto"
        >
          {providers.map((provider, i) => (
            <motion.div
              key={provider.name}
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
              {/* Logo */}
              <h3
                className={`text-3xl sm:text-4xl font-bold bg-gradient-to-r ${provider.gradientFrom} ${provider.gradientTo} bg-clip-text text-transparent mb-1`}
              >
                {provider.name}
              </h3>

              {/* Subtitle */}
              <p className="text-prose text-sm mb-6">{provider.subtitle}</p>

              {/* Features */}
              <ul className="space-y-3">
                {provider.features.map((feature) => (
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
          Switch between providers instantly from your settings
        </motion.p>
      </div>
    </section>
  );
}

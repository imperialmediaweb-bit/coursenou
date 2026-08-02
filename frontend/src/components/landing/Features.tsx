import { motion } from 'framer-motion';
import {
  Sparkles,
  Headphones,
  Brain,
  Award,
  FileDown,
  Globe,
  MessageCircle,
  Share2,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  featured?: boolean;
}

const features: Feature[] = [
  {
    icon: Sparkles,
    title: 'AI Course Generation',
    description:
      'Type a subject and get a structured course — modules, written lessons, illustrations and a quiz.',
    featured: true,
  },
  {
    icon: Headphones,
    title: 'Audio Courses',
    description:
      'Listen to any course as a podcast. AI converts text to natural speech.',
  },
  {
    icon: Brain,
    title: 'AI Quiz & Exams',
    description:
      'Auto-generated quizzes in 23 languages. Test knowledge with explanations.',
  },
  {
    icon: Award,
    title: 'Certificates',
    description:
      'Earn downloadable certificates upon course completion.',
  },
  {
    icon: FileDown,
    title: 'Export PDF & PPT',
    description:
      'Download complete courses as PDF or PowerPoint.',
  },
  {
    icon: Globe,
    title: '23 Languages',
    description:
      'Generate courses in any of 23 supported languages.',
  },
  {
    icon: MessageCircle,
    title: 'AI Chatbot',
    description:
      'Real-time AI tutor answers questions about your course content.',
  },
  {
    icon: Share2,
    title: 'Share & Collaborate',
    description:
      'Share any course via public link. Collaborate with others.',
  },
  {
    icon: BarChart3,
    title: 'Admin Dashboard',
    description:
      'Full analytics, user management, revenue tracking.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

function FeaturedDemo() {
  const topics = ['Introduction to AI', 'Neural Networks', 'Deep Learning'];

  return (
    <div className="mt-6 bg-base/60 rounded-xl border border-border/60 p-4 space-y-2">
      {topics.map((topic, i) => (
        <div
          key={topic}
          className="flex items-center gap-3 px-3 py-2 rounded-lg"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              i === 0 ? 'bg-accent' : 'bg-muted'
            }`}
          />
          <span
            className={`text-sm font-sans ${
              i === 0 ? 'text-accent' : 'text-prose'
            }`}
          >
            {topic}
          </span>
          {i === 2 && (
            <span className="inline-block w-[2px] h-4 bg-accent animate-typing-cursor ml-0.5" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Features() {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <section id="features" className="py-24 lg:py-32 bg-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white text-center max-w-3xl mx-auto mb-4"
        >
          Everything you need to create, share, and monetize knowledge
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-prose text-center mb-16 max-w-xl mx-auto leading-relaxed"
        >
          Powerful AI tools to build professional courses in minutes — no
          expertise required.
        </motion.p>

        <div
          ref={ref}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5"
        >
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                variants={cardVariants}
                whileHover={{
                  y: -4,
                  borderColor: 'rgba(108, 71, 255, 0.4)',
                  boxShadow: '0 0 20px rgba(108, 71, 255, 0.1)',
                }}
                transition={{ duration: 0.25 }}
                className={`bg-surface border border-border rounded-2xl p-6 lg:p-8 group cursor-default relative overflow-hidden ${
                  feature.featured ? 'sm:col-span-2' : ''
                }`}
              >
                {/* Subtle grid pattern for featured card */}
                {feature.featured && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle, #6C47FF 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                )}

                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>

                  <h3 className="text-lg font-sans font-semibold text-white mb-2">
                    {feature.title}
                  </h3>

                  <p className="text-sm text-prose leading-relaxed">
                    {feature.description}
                  </p>

                  {feature.featured && <FeaturedDemo />}
                </div>

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

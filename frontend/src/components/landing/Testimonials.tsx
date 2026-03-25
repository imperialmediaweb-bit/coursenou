import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  stars: number;
}

const testimonials: Testimonial[] = [
  {
    name: 'Sarah K.',
    role: 'University Professor',
    quote:
      'Coursbit completely transformed how I prepare course materials. What used to take weeks now takes minutes. The AI-generated content is surprisingly accurate and well-structured.',
    stars: 5,
  },
  {
    name: 'Marcus T.',
    role: 'Corporate Trainer',
    quote:
      'We use Coursbit for all our onboarding programs. The multilingual support is a game-changer for our global team.',
    stars: 5,
  },
  {
    name: 'Elena R.',
    role: 'EdTech Founder',
    quote:
      'The quality of AI-generated courses rivals hand-crafted content. Our users love the quiz feature and certificates. Revenue increased 40% since we started using Coursbit for content generation.',
    stars: 5,
  },
  {
    name: 'James L.',
    role: 'High School Teacher',
    quote:
      'My students are more engaged than ever. I generate courses in minutes and focus on teaching.',
    stars: 5,
  },
  {
    name: 'Priya S.',
    role: 'Online Creator',
    quote:
      "I've tried every course platform. Coursbit is the only one where I can go from idea to published course in under 10 minutes. The export options are incredible \u2014 PDF, PPT, audio, everything.",
    stars: 4,
  },
  {
    name: 'David C.',
    role: 'Learning Designer',
    quote:
      'The AI chatbot tutor is brilliant. Students get instant help.',
    stars: 5,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
};

export default function Testimonials() {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <section className="py-24 lg:py-32 bg-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-display italic text-white text-center mb-16"
        >
          Loved by educators and creators
        </motion.h2>

        <div
          ref={ref}
          className="columns-1 sm:columns-2 lg:columns-3 gap-4 max-w-6xl mx-auto"
        >
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.name}
              custom={i}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={cardVariants as never}
              className="bg-surface border border-border rounded-2xl p-6 break-inside-avoid mb-4"
            >
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 text-accent font-semibold flex items-center justify-center text-sm">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-muted text-xs">{testimonial.role}</p>
                </div>
              </div>

              {/* Stars */}
              <div className="flex gap-0.5 my-3">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star
                    key={si}
                    className={`w-4 h-4 ${
                      si < testimonial.stars
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-none text-border'
                    }`}
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-prose text-sm leading-relaxed">
                <span className="text-accent-glow font-display text-lg leading-none">
                  &ldquo;
                </span>
                {testimonial.quote}
                <span className="text-accent-glow font-display text-lg leading-none">
                  &rdquo;
                </span>
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

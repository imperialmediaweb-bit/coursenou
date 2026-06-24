import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What AI models does Coursbit use?',
    answer:
      'Coursbit supports Google Gemini, OpenAI GPT-4o, and Anthropic Claude. The system automatically selects the best available provider for optimal results. All providers support 23 languages and generate high-quality educational content.',
  },
  {
    question: 'Is the free plan really free forever?',
    answer:
      'Yes! The free plan includes 10 image courses, PDF export, AI quizzes, and certificates. No credit card required, no time limit.',
  },
  {
    question: 'Can I generate courses in my language?',
    answer:
      'Absolutely. Coursbit supports 23 languages including English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic, Hindi, and more.',
  },
  {
    question: 'How long does it take to generate a course?',
    answer:
      'Most courses are generated in 1-3 minutes depending on the number of topics. Our AI processes everything in parallel for maximum speed.',
  },
  {
    question: 'Can I export and sell my courses?',
    answer:
      'Yes! Pro users can export courses as PDF and PowerPoint. You own all content generated through Coursbit and can use it commercially.',
  },
  {
    question: "What's the difference between image and video courses?",
    answer:
      'Image courses include text content with relevant images. Video courses (Pro only) also include curated video resources and enhanced multimedia content.',
  },
  {
    question: 'Do I get a certificate for every course?',
    answer:
      'Yes! Complete any course and pass the auto-generated quiz to earn a downloadable certificate with your name, course title, and completion date.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer:
      'Yes, cancel anytime from your billing page. You\u2019ll keep access until the end of your billing period. No questions asked.',
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.5,
      ease: "easeOut" as const,
    },
  }),
};

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const leftColumn = faqs.slice(0, 4);
  const rightColumn = faqs.slice(4, 8);

  return (
    <section id="faq" className="py-24 lg:py-32 bg-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white text-center mb-16"
        >
          Questions &amp; Answers
        </motion.h2>

        <div
          ref={ref}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto"
        >
          {/* Left column */}
          <div className="flex flex-col gap-4">
            {leftColumn.map((faq, i) => {
              const globalIndex = i;
              return (
                <motion.div
                  key={globalIndex}
                  custom={i}
                  initial="hidden"
                  animate={inView ? 'visible' : 'hidden'}
                  variants={itemVariants}
                  className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggle(globalIndex)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span className="text-sm font-sans font-medium text-white pr-4">
                      {faq.question}
                    </span>
                    <motion.span
                      animate={{ rotate: openIndex === globalIndex ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="w-4 h-4 text-muted" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openIndex === globalIndex && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        <p className="px-5 pb-5 text-sm text-prose leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {rightColumn.map((faq, i) => {
              const globalIndex = i + 4;
              return (
                <motion.div
                  key={globalIndex}
                  custom={i + 4}
                  initial="hidden"
                  animate={inView ? 'visible' : 'hidden'}
                  variants={itemVariants}
                  className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggle(globalIndex)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span className="text-sm font-sans font-medium text-white pr-4">
                      {faq.question}
                    </span>
                    <motion.span
                      animate={{ rotate: openIndex === globalIndex ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="w-4 h-4 text-muted" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openIndex === globalIndex && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        <p className="px-5 pb-5 text-sm text-prose leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

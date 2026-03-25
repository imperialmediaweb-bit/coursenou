import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import Button from '../ui/Button';

interface PricingPlan {
  name: string;
  badge?: string;
  badgeStyle?: string;
  featured?: boolean;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyMonthly: string;
  priceSuffix: string;
  yearlySuffix: string;
  features: string[];
  cta: string;
  ctaVariant: 'primary' | 'ghost';
  ctaArrow?: boolean;
  href: string;
}

const plans: PricingPlan[] = [
  {
    name: 'Free',
    monthlyPrice: '$0',
    yearlyPrice: '$0',
    yearlyMonthly: '$0',
    priceSuffix: '/forever',
    yearlySuffix: '/forever',
    features: [
      '10 image courses',
      '5 topics per course',
      'PDF export',
      'AI Quiz',
      'Certificate',
      'Community support',
    ],
    cta: 'Get Started Free',
    ctaVariant: 'ghost',
    href: '/register',
  },
  {
    name: 'Pro',
    badge: 'Most Popular',
    badgeStyle:
      'bg-accent text-white text-xs px-3 py-1 rounded-full absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap',
    featured: true,
    monthlyPrice: '$12',
    yearlyPrice: '$79',
    yearlyMonthly: '$6.58',
    priceSuffix: '/month',
    yearlySuffix: '/month',
    features: [
      'Everything in Free',
      'Unlimited courses',
      'Video courses',
      '20 topics per course',
      'Audio courses',
      'PPT export',
      'AI Chatbot',
      'Priority support',
    ],
    cta: 'Start Pro',
    ctaVariant: 'primary',
    ctaArrow: true,
    href: '/register?plan=pro',
  },
  {
    name: 'Pro Yearly',
    badge: 'Best Value',
    badgeStyle:
      'bg-accent/20 text-accent border border-accent/30 text-xs px-3 py-1 rounded-full absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap',
    monthlyPrice: '$6.58',
    yearlyPrice: '$79',
    yearlyMonthly: '$6.58',
    priceSuffix: '/mo',
    yearlySuffix: '/year',
    features: [
      'Everything in Free',
      'Unlimited courses',
      'Video courses',
      '20 topics per course',
      'Audio courses',
      'PPT export',
      'AI Chatbot',
      'Priority support',
      'Early access features',
      '1:1 onboarding call',
    ],
    cta: 'Get Yearly',
    ctaVariant: 'primary',
    ctaArrow: false,
    href: '/register?plan=yearly',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.6,
      ease: "easeOut",
    },
  }),
};

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });

  function getPrice(plan: PricingPlan) {
    if (plan.name === 'Free') return { amount: '$0', suffix: '/forever' };
    if (plan.name === 'Pro') {
      return isYearly
        ? { amount: '$6.58', suffix: '/month' }
        : { amount: '$12', suffix: '/month' };
    }
    // Pro Yearly
    return isYearly
      ? { amount: '$79', suffix: '/year' }
      : { amount: '$6.58', suffix: '/mo' };
  }

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-surface/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-display italic text-white text-center"
        >
          Simple, transparent pricing
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-prose text-center mt-4 mb-8"
        >
          Start free. Upgrade when you need more.
        </motion.p>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center mb-12"
        >
          <div className="bg-surface border border-border rounded-full p-1 inline-flex relative">
            <button
              onClick={() => setIsYearly(false)}
              className={`relative z-10 px-4 py-2 rounded-full text-sm font-sans cursor-pointer transition-colors duration-200 ${
                !isYearly ? 'text-white' : 'text-prose hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`relative z-10 px-4 py-2 rounded-full text-sm font-sans cursor-pointer transition-colors duration-200 flex items-center gap-2 ${
                isYearly ? 'text-white' : 'text-prose hover:text-white'
              }`}
            >
              Yearly
              <span className="bg-accent/20 text-accent text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                Save 40%
              </span>
            </button>

            {/* Animated pill background */}
            <motion.div
              layoutId="pricing-pill"
              className="absolute top-1 bottom-1 rounded-full bg-accent"
              style={{
                left: !isYearly ? 4 : undefined,
                right: isYearly ? 4 : undefined,
                width: isYearly ? 'calc(50% + 12px)' : 'calc(50% - 12px)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          </div>
        </motion.div>

        {/* Cards */}
        <div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start"
        >
          {plans.map((plan, i) => {
            const price = getPrice(plan);
            return (
              <motion.div
                key={plan.name}
                custom={i}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                variants={cardVariants as never}
                whileHover={{
                  y: -4,
                  borderColor: 'rgba(108, 71, 255, 0.4)',
                }}
                transition={{ duration: 0.25 }}
                className={`relative rounded-2xl p-8 ${
                  plan.featured
                    ? 'bg-surface border border-accent/50 shadow-[0_0_40px_rgba(108,71,255,0.15)] md:scale-105 md:z-10'
                    : 'bg-surface border border-border'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <span className={plan.badgeStyle}>{plan.badge}</span>
                )}

                {/* Plan name */}
                <h3 className="text-lg font-semibold text-white mt-2 mb-4">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-6">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={price.amount}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.25 }}
                      className="text-4xl font-display italic text-white"
                    >
                      {price.amount}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-prose text-sm">{price.suffix}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span className="text-sm text-prose">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  variant={plan.ctaVariant}
                  arrow={plan.ctaArrow}
                  href={plan.href}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

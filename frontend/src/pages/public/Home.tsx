import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiSparkles,
  HiMusicalNote,
  HiAcademicCap,
  HiGlobeAlt,
  HiDocumentArrowDown,
  HiUserGroup,
  HiCheck,
  HiXMark,
  HiChevronDown,
} from 'react-icons/hi2';

const features = [
  {
    icon: HiSparkles,
    title: 'AI Generation',
    description:
      'Type a subject and get a complete course — structured modules, written lessons and an illustration for each one.',
  },
  {
    icon: HiMusicalNote,
    title: 'Audio Courses',
    description:
      'Convert any course to audio format for on-the-go learning. Listen while you commute, exercise, or relax.',
  },
  {
    icon: HiAcademicCap,
    title: 'Quiz & Certificates',
    description:
      'Test your knowledge with AI-generated quizzes. Earn certificates upon successful completion.',
  },
  {
    icon: HiGlobeAlt,
    title: 'Multi-language',
    description:
      'Generate courses in 23 languages. Learn in your native language or practice a new one.',
  },
  {
    icon: HiDocumentArrowDown,
    title: 'Export PDF/PPT',
    description:
      'Download your courses as PDF or PowerPoint presentations. Perfect for offline study or sharing.',
  },
  {
    icon: HiUserGroup,
    title: 'Share & Collaborate',
    description:
      'Share courses with a single link. No account needed for viewers. Great for teams and classrooms.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Enter Your Topic',
    description:
      'Type any topic you want to learn about. Choose your language, AI provider, and content type.',
  },
  {
    number: '2',
    title: 'AI Generates Content',
    description:
      'Our AI creates a complete course with topics, subtopics, images, and structured learning material.',
  },
  {
    number: '3',
    title: 'Learn & Share',
    description:
      'Study at your own pace, take quizzes, earn certificates, and share your courses with anyone.',
  },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    badge: null,
    features: [
      { text: 'Up to 10 courses', included: true },
      { text: 'Up to 5 topics per course', included: true },
      { text: '23 languages', included: true },
      { text: 'Quizzes and certificates', included: true },
      { text: 'PDF export', included: true },
      { text: 'PowerPoint export', included: false },
      { text: 'Audio generation', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    name: 'Monthly',
    price: '$9.99',
    period: '/mo',
    badge: null,
    features: [
      { text: 'Unlimited courses', included: true },
      { text: 'Up to 20 topics per course', included: true },
      { text: '23 languages', included: true },
      { text: 'Quizzes and certificates', included: true },
      { text: 'PDF export', included: true },
      { text: 'PowerPoint export', included: true },
      { text: 'Audio generation', included: true },
      { text: 'Priority support', included: false },
    ],
  },
  {
    name: 'Yearly',
    price: '$79.99',
    period: '/yr',
    badge: 'Most Popular',
    features: [
      { text: 'Unlimited courses', included: true },
      { text: 'Up to 20 topics per course', included: true },
      { text: '23 languages', included: true },
      { text: 'Quizzes and certificates', included: true },
      { text: 'PDF export', included: true },
      { text: 'PowerPoint export', included: true },
      { text: 'Audio generation', included: true },
      { text: 'Priority support', included: true },
    ],
  },
];

const testimonials = [
  {
    initials: 'SK',
    name: 'Sarah K.',
    role: 'Online Educator',
    quote:
      'CourseBit transformed how I create learning material. What used to take weeks now takes minutes. The AI-generated content is surprisingly thorough.',
  },
  {
    initials: 'MR',
    name: 'Michael R.',
    role: 'Corporate Trainer',
    quote:
      'The multi-language support is a game changer for our global team. We generate the same course in 5 languages and everyone learns in their native tongue.',
  },
  {
    initials: 'JP',
    name: 'Jessica P.',
    role: 'Student',
    quote:
      'I use CourseBit to create study guides for my university courses. The quizzes and certificates keep me motivated. Best study tool I have found!',
  },
];

const faqs = [
  {
    question: 'What is CourseBit?',
    answer:
      'CourseBit is an AI-powered course generation platform. You enter any topic and our AI creates a complete, structured course with topics, subtopics, images, quizzes, and more. It is designed for educators, students, and professionals who want to create or consume learning content quickly.',
  },
  {
    question: 'How is the course written?',
    answer:
      'Every lesson is written individually by a large language model, so what you get is teaching material rather than an outline. Several models sit behind the platform and it falls back automatically if one is unavailable, so generation keeps working when a provider has a bad day.',
  },
  {
    question: 'What languages are supported?',
    answer:
      'CourseBit supports 23 languages including English, Spanish, French, German, Portuguese, Italian, Dutch, Russian, Chinese, Japanese, Korean, Arabic, Hindi, Turkish, Polish, Swedish, Danish, Norwegian, Finnish, Czech, Romanian, Hungarian, and Greek.',
  },
  {
    question: 'What is the difference between the plans?',
    answer:
      'The Free plan gives you up to 10 courses of 5 topics each, with quizzes, certificates and PDF export. The Monthly plan ($9.99/mo) removes the course limit, raises the cap to 20 topics, and adds PowerPoint export and audio. The Yearly plan ($79.99/yr) is everything in Monthly plus priority support, and works out 33% cheaper than paying monthly.',
  },
  {
    question: 'What export formats are available?',
    answer:
      'Paid plan users can export courses as PDF documents and PowerPoint (PPT) presentations. These exports include all course content, images, and formatting, perfect for offline study or presenting to a class or team.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer:
      'Yes, you can cancel your subscription at any time from your account settings. Your access continues until the end of your current billing period. No questions asked and no cancellation fees.',
  },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Generate Complete AI Courses in Minutes
            </h1>
            <p className="text-lg md:text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
              Type a subject and get a complete course in minutes — in any of 23
              languages, with quizzes, audio and certificates.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-surface text-accent-glow font-semibold rounded-lg shadow-lg hover:bg-accent/10 transition-colors text-lg"
              >
                Get Started Free
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-white text-white font-semibold rounded-lg hover:bg-surface/10 transition-colors text-lg"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-base">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need to Create & Learn
            </h2>
            <p className="text-lg text-prose max-w-2xl mx-auto">
              CourseBit combines cutting-edge AI with powerful learning tools to
              deliver a complete course creation experience.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-surface rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border"
              >
                <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-prose">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-prose">
              Three simple steps to create your AI-powered course.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-prose">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-base" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-prose">
              Start free and upgrade as you grow. Save 33% with yearly billing.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-surface rounded-xl shadow-sm border-2 p-8 relative ${
                  plan.badge
                    ? 'border-accent shadow-md'
                    : 'border-border'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-white text-sm font-semibold px-4 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-white">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted ml-1">{plan.period}</span>
                    )}
                  </div>
                  {plan.name === 'Yearly' && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      Save 33%
                    </p>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-3">
                      {f.included ? (
                        <HiCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <HiXMark className="w-5 h-5 text-muted flex-shrink-0" />
                      )}
                      <span
                        className={
                          f.included ? 'text-prose' : 'text-muted'
                        }
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block w-full text-center py-3 rounded-lg font-semibold transition-colors ${
                    plan.badge
                      ? 'bg-accent text-white hover:bg-accent-glow'
                      : 'bg-surface text-white hover:bg-border'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Loved by Learners & Educators
            </h2>
            <p className="text-lg text-prose">
              See what our users have to say about CourseBit.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-base rounded-xl p-6 border border-border"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-white font-semibold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-sm text-muted">{t.role}</p>
                  </div>
                </div>
                <p className="text-prose italic">&ldquo;{t.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-base">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-prose">
              Got questions? We have answers.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-semibold text-white">
                    {faq.question}
                  </span>
                  <HiChevronDown
                    className={`w-5 h-5 text-muted transition-transform ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4">
                    <p className="text-prose">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Create Your First Course?
          </h2>
          <p className="text-lg text-indigo-100 mb-8">
            Join thousands of learners and educators using CourseBit to create
            AI-powered courses in minutes.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-surface text-accent-glow font-semibold rounded-lg shadow-lg hover:bg-accent/10 transition-colors text-lg"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}

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
      'Generate complete courses with Gemini or GPT-4o. Rich content with images, structured topics, and subtopics.',
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
      { text: '3 courses per month', included: true },
      { text: 'Gemini AI provider', included: true },
      { text: '23 languages', included: true },
      { text: 'Basic quizzes', included: true },
      { text: 'Audio generation', included: false },
      { text: 'PDF/PPT export', included: false },
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
      { text: 'Gemini + GPT-4o', included: true },
      { text: '23 languages', included: true },
      { text: 'Advanced quizzes', included: true },
      { text: 'Audio generation', included: true },
      { text: 'PDF/PPT export', included: true },
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
      { text: 'Gemini + GPT-4o', included: true },
      { text: '23 languages', included: true },
      { text: 'Advanced quizzes', included: true },
      { text: 'Audio generation', included: true },
      { text: 'PDF/PPT export', included: true },
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
    question: 'Which AI providers does CourseBit use?',
    answer:
      'CourseBit supports two leading AI providers: Google Gemini and OpenAI GPT-4o. Free plan users have access to Gemini, while paid plan users can choose between both providers for course generation.',
  },
  {
    question: 'What languages are supported?',
    answer:
      'CourseBit supports 23 languages including English, Spanish, French, German, Portuguese, Italian, Dutch, Russian, Chinese, Japanese, Korean, Arabic, Hindi, Turkish, Polish, Swedish, Danish, Norwegian, Finnish, Czech, Romanian, Hungarian, and Thai.',
  },
  {
    question: 'What is the difference between the plans?',
    answer:
      'The Free plan gives you 3 courses per month with Gemini AI. The Monthly plan ($9.99/mo) unlocks unlimited courses, GPT-4o access, audio generation, and PDF/PPT export. The Yearly plan ($79.99/yr) includes everything in Monthly plus priority support, saving you 33% compared to monthly billing.',
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
              Powered by Gemini and GPT-4o. Create courses in 23 languages with
              quizzes, audio, certificates, and more — all with the power of AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-indigo-700 font-semibold rounded-lg shadow-lg hover:bg-indigo-50 transition-colors text-lg"
              >
                Get Started Free
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-lg"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Create & Learn
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              CourseBit combines cutting-edge AI with powerful learning tools to
              deliver a complete course creation experience.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Three simple steps to create your AI-powered course.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600">
              Start free and upgrade as you grow. Save 33% with yearly billing.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-xl shadow-sm border-2 p-8 relative ${
                  plan.badge
                    ? 'border-indigo-600 shadow-md'
                    : 'border-gray-100'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-500 ml-1">{plan.period}</span>
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
                        <HiXMark className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      )}
                      <span
                        className={
                          f.included ? 'text-gray-700' : 'text-gray-400'
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
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
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
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Loved by Learners & Educators
            </h2>
            <p className="text-lg text-gray-600">
              See what our users have to say about CourseBit.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-gray-50 rounded-xl p-6 border border-gray-100"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500">{t.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">&ldquo;{t.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Got questions? We have answers.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-semibold text-gray-900">
                    {faq.question}
                  </span>
                  <HiChevronDown
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600">{faq.answer}</p>
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
            className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-indigo-700 font-semibold rounded-lg shadow-lg hover:bg-indigo-50 transition-colors text-lg"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { HiCheck, HiXMark } from 'react-icons/hi2';

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

const comparisonFeatures = [
  { feature: 'Courses', free: 'Up to 10', monthly: 'Unlimited', yearly: 'Unlimited' },
  { feature: 'Topics per course', free: '5', monthly: '20', yearly: '20' },
  { feature: 'Languages', free: '23', monthly: '23', yearly: '23' },
  { feature: 'Quizzes', free: 'Yes', monthly: 'Yes', yearly: 'Yes' },
  { feature: 'Certificates', free: 'Yes', monthly: 'Yes', yearly: 'Yes' },
  { feature: 'PDF Export', free: 'Yes', monthly: 'Yes', yearly: 'Yes' },
  { feature: 'PowerPoint Export', free: 'No', monthly: 'Yes', yearly: 'Yes' },
  { feature: 'Audio Generation', free: 'No', monthly: 'Yes', yearly: 'Yes' },
  { feature: 'Share Courses', free: 'Yes', monthly: 'Yes', yearly: 'Yes' },
  { feature: 'Priority Support', free: 'No', monthly: 'No', yearly: 'Yes' },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-base py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-prose max-w-2xl mx-auto">
            Start free and upgrade as you grow. Save 33% with yearly billing.
            No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
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

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">
            Full Feature Comparison
          </h2>
          <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-base">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-white">
                      Feature
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-white">
                      Free
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-white">
                      Monthly
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-accent">
                      Yearly
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, idx) => (
                    <tr
                      key={row.feature}
                      className={idx < comparisonFeatures.length - 1 ? 'border-b border-border' : ''}
                    >
                      <td className="px-6 py-4 text-sm text-prose font-medium">
                        {row.feature}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={row.free === 'No' ? 'text-muted' : 'text-prose'}>
                          {row.free === 'Yes' ? (
                            <HiCheck className="w-5 h-5 text-green-500 mx-auto" />
                          ) : row.free === 'No' ? (
                            <HiXMark className="w-5 h-5 text-muted mx-auto" />
                          ) : (
                            row.free
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={row.monthly === 'No' ? 'text-muted' : 'text-prose'}>
                          {row.monthly === 'Yes' ? (
                            <HiCheck className="w-5 h-5 text-green-500 mx-auto" />
                          ) : row.monthly === 'No' ? (
                            <HiXMark className="w-5 h-5 text-muted mx-auto" />
                          ) : (
                            row.monthly
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={row.yearly === 'No' ? 'text-muted' : 'text-accent font-medium'}>
                          {row.yearly === 'Yes' ? (
                            <HiCheck className="w-5 h-5 text-green-500 mx-auto" />
                          ) : row.yearly === 'No' ? (
                            <HiXMark className="w-5 h-5 text-muted mx-auto" />
                          ) : (
                            row.yearly
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

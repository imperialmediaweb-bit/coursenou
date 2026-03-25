import { Link } from 'react-router-dom';
import { HiCheck, HiXMark } from 'react-icons/hi2';

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

const comparisonFeatures = [
  { feature: 'Courses per month', free: '3', monthly: 'Unlimited', yearly: 'Unlimited' },
  { feature: 'AI Providers', free: 'Gemini', monthly: 'Gemini + GPT-4o', yearly: 'Gemini + GPT-4o' },
  { feature: 'Languages', free: '23', monthly: '23', yearly: '23' },
  { feature: 'Quiz Generation', free: 'Basic', monthly: 'Advanced', yearly: 'Advanced' },
  { feature: 'Certificates', free: 'Yes', monthly: 'Yes', yearly: 'Yes' },
  { feature: 'Audio Generation', free: 'No', monthly: 'Yes', yearly: 'Yes' },
  { feature: 'PDF Export', free: 'No', monthly: 'Yes', yearly: 'Yes' },
  { feature: 'PPT Export', free: 'No', monthly: 'Yes', yearly: 'Yes' },
  { feature: 'Share Courses', free: 'Yes', monthly: 'Yes', yearly: 'Yes' },
  { feature: 'Priority Support', free: 'No', monthly: 'No', yearly: 'Yes' },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start free and upgrade as you grow. Save 33% with yearly billing.
            No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
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

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">
            Full Feature Comparison
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">
                      Feature
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">
                      Free
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">
                      Monthly
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-indigo-600">
                      Yearly
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, idx) => (
                    <tr
                      key={row.feature}
                      className={idx < comparisonFeatures.length - 1 ? 'border-b border-gray-100' : ''}
                    >
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                        {row.feature}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={row.free === 'No' ? 'text-gray-400' : 'text-gray-700'}>
                          {row.free === 'Yes' ? (
                            <HiCheck className="w-5 h-5 text-green-500 mx-auto" />
                          ) : row.free === 'No' ? (
                            <HiXMark className="w-5 h-5 text-gray-300 mx-auto" />
                          ) : (
                            row.free
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={row.monthly === 'No' ? 'text-gray-400' : 'text-gray-700'}>
                          {row.monthly === 'Yes' ? (
                            <HiCheck className="w-5 h-5 text-green-500 mx-auto" />
                          ) : row.monthly === 'No' ? (
                            <HiXMark className="w-5 h-5 text-gray-300 mx-auto" />
                          ) : (
                            row.monthly
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span className={row.yearly === 'No' ? 'text-gray-400' : 'text-indigo-600 font-medium'}>
                          {row.yearly === 'Yes' ? (
                            <HiCheck className="w-5 h-5 text-green-500 mx-auto" />
                          ) : row.yearly === 'No' ? (
                            <HiXMark className="w-5 h-5 text-gray-300 mx-auto" />
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

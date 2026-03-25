import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Invoice } from '../../types';

const PLANS = [
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: '$9.99',
    period: '/month',
    features: ['Unlimited courses', 'Video courses', '20 topics per course', 'Audio & PPT export', 'AI Chatbot', 'Priority support'],
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: '$79.99',
    period: '/year',
    badge: 'Save 33%',
    features: ['Everything in Monthly', 'Save $40/year', 'Early access features', '1:1 onboarding'],
  },
];

export default function BillingPage() {
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const isPaid = user?.plan === 'monthly' || user?.plan === 'yearly';

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await api.get('/billing/invoices');
        setInvoices(res.data.data || res.data || []);
      } catch {
        // silently ignore
      }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="min-h-screen bg-base py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-sans font-bold text-white mb-8">Billing</h1>

        {/* Current Plan */}
        <div className="bg-surface border border-border rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted font-sans mb-1">Current Plan</p>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-sans font-bold text-white capitalize">{user?.plan || 'Free'}</h2>
                {isPaid && (
                  <span className="px-2.5 py-0.5 bg-accent/20 text-accent text-xs font-sans font-semibold rounded-full">
                    Active
                  </span>
                )}
              </div>
              {user?.planExpiresAt && (
                <p className="text-sm text-muted font-sans mt-1">
                  {isPaid ? 'Renews' : 'Expires'}: {new Date(user.planExpiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
            {isPaid && (
              <span className="flex items-center gap-2 text-sm text-green-400 font-sans">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                All features unlocked
              </span>
            )}
          </div>

          {/* Plan features */}
          {isPaid && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted font-sans mb-3">Your plan includes:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['Unlimited courses', 'Video courses', '20 topics/course', 'AI Chatbot', 'Audio download', 'PDF & PPT export', 'Certificates', 'Flashcards', 'No ads'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-prose font-sans">
                    <svg className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upgrade section (only if not paid) */}
        {!isPaid && (
          <div className="mb-8">
            <h3 className="text-lg font-sans font-semibold text-white mb-4">Upgrade to Pro</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-surface border border-border rounded-2xl p-6 relative hover:border-accent/40 transition-colors"
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-accent text-white text-[10px] font-sans font-semibold rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <h4 className="text-lg font-sans font-semibold text-white">{plan.name}</h4>
                  <div className="flex items-baseline gap-1 mt-2 mb-4">
                    <span className="text-3xl font-sans font-bold text-white">{plan.price}</span>
                    <span className="text-sm text-muted">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-prose font-sans">
                        <svg className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button className="w-full py-2.5 bg-accent text-white text-sm font-sans font-semibold rounded-xl hover:bg-accent-glow transition-colors">
                    Upgrade to {plan.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h3 className="text-lg font-sans font-semibold text-white mb-4">Payment History</h3>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted font-sans py-4 text-center">No invoices yet</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div key={inv._id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-white font-sans font-medium capitalize">{inv.plan} Plan</p>
                    <p className="text-xs text-muted font-sans">{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-sans font-medium">
                      ${inv.amount?.toFixed(2)} {inv.currency?.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-sans font-semibold rounded-full ${
                      inv.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

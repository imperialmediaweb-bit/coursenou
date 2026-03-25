import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  HiOutlineCreditCard,
  HiOutlineCheckCircle,
  HiOutlineDownload,
  HiOutlineStar,
  HiOutlineExclamation,
} from 'react-icons/hi';
import {
  FaStripe,
  FaPaypal,
} from 'react-icons/fa';
import { SiRazorpay } from 'react-icons/si';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Invoice } from '../../types';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$9.99',
    priceValue: 9.99,
    period: '/month',
    features: [
      'Up to 20 topics per course',
      'Video course generation',
      'PPT & PDF export',
      'Audio narration',
      'Priority AI generation',
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$79.99',
    priceValue: 79.99,
    period: '/year',
    popular: true,
    features: [
      'Everything in Monthly',
      'Save 33% vs monthly',
      'Up to 20 topics per course',
      'Video course generation',
      'All premium features',
    ],
  },
];

const PAYMENT_PROVIDERS = [
  { id: 'stripe', name: 'Stripe', icon: FaStripe, color: 'text-[#635BFF]' },
  { id: 'paypal', name: 'PayPal', icon: FaPaypal, color: 'text-[#003087]' },
  { id: 'razorpay', name: 'Razorpay', icon: SiRazorpay, color: 'text-[#0C2451]' },
  { id: 'paystack', name: 'Paystack', icon: HiOutlineCreditCard, color: 'text-[#00C3F7]' },
];

export default function BillingPage() {
  const { user, fetchUser } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isPaid = user?.plan === 'monthly' || user?.plan === 'yearly';

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const res = await api.get('/payments/invoices');
      setInvoices(res.data.data || res.data);
    } catch {
      // No invoices yet
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedProvider) {
      toast.error('Please select a payment method');
      return;
    }

    try {
      setProcessing(true);
      const res = await api.post(`/payments/${selectedProvider}/create`, {
        plan: selectedPlan,
      });

      switch (selectedProvider) {
        case 'stripe':
          if (res.data.url) window.location.href = res.data.url;
          break;
        case 'paypal':
          if (res.data.approvalUrl) window.location.href = res.data.approvalUrl;
          break;
        case 'razorpay':
          if (res.data.orderId) {
            const options = {
              key: res.data.key,
              amount: res.data.amount,
              currency: res.data.currency || 'INR',
              name: 'CourseBit',
              description: `${selectedPlan} Plan`,
              order_id: res.data.orderId,
              handler: async (response: Record<string, string>) => {
                try {
                  await api.post('/payments/razorpay/verify', {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  });
                  toast.success('Payment successful!');
                  fetchUser();
                  fetchInvoices();
                } catch {
                  toast.error('Payment verification failed');
                }
              },
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
          }
          break;
        case 'paystack':
          if (res.data.authorizationUrl) window.location.href = res.data.authorizationUrl;
          break;
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return;
    }
    try {
      setCancelling(true);
      await api.post('/payments/cancel');
      toast.success('Subscription cancelled');
      fetchUser();
    } catch {
      toast.error('Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Subscription</h1>

        {/* Current Plan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    isPaid
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {user?.plan === 'monthly'
                    ? 'Monthly'
                    : user?.plan === 'yearly'
                    ? 'Yearly'
                    : 'Free'}
                </span>
                {isPaid && user?.planExpiresAt && (
                  <span className="text-sm text-gray-500">
                    Expires: {new Date(user.planExpiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            {isPaid && (
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {cancelling ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                ) : (
                  <HiOutlineExclamation className="h-4 w-4" />
                )}
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Upgrade Section */}
        {!isPaid && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upgrade Your Plan</h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative bg-white rounded-xl border-2 p-6 cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? 'border-indigo-600 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-0.5 bg-indigo-600 text-white text-xs font-medium rounded-full">
                      <HiOutlineStar className="h-3 w-3" />
                      Popular
                    </span>
                  )}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-500">{plan.period}</span>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <HiOutlineCheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {selectedPlan === plan.id && (
                    <div className="absolute top-4 right-4">
                      <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                        <HiOutlineCheckCircle className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Payment Methods */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {PAYMENT_PROVIDERS.map((provider) => {
                const Icon = provider.icon;
                return (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      selectedProvider === provider.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-8 w-8 ${provider.color}`} />
                    <span className="text-sm font-medium text-gray-700">{provider.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePayment}
              disabled={processing || !selectedProvider}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-8"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Processing...
                </>
              ) : (
                <>
                  <HiOutlineCreditCard className="h-5 w-5" />
                  Subscribe Now
                </>
              )}
            </button>
          </>
        )}

        {/* Invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Invoice History</h2>
          </div>
          {loadingInvoices ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No invoices yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Plan</th>
                    <th className="px-6 py-3">Provider</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ${invoice.amount.toFixed(2)} {invoice.currency.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                        {invoice.plan}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                        {invoice.provider}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : invoice.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : invoice.status === 'refunded'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {invoice.receiptUrl && (
                          <a
                            href={invoice.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-700"
                          >
                            <HiOutlineDownload className="h-5 w-5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

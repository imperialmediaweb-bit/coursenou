export const PLAN_LIMITS = {
  free: {
    maxTopics: 5,
    maxCourses: 10,
    allowVideo: false,
    allowAudio: false,
    allowPptExport: false,
    showAds: true,
  },
  monthly: {
    maxTopics: 20,
    maxCourses: Infinity,
    allowVideo: true,
    allowAudio: true,
    allowPptExport: true,
    showAds: false,
  },
  yearly: {
    maxTopics: 20,
    maxCourses: Infinity,
    allowVideo: true,
    allowAudio: true,
    allowPptExport: true,
    showAds: false,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export const PLAN_PRICES = {
  monthly: { amount: 9.99, currency: 'usd', label: 'Monthly' },
  yearly: { amount: 79.99, currency: 'usd', label: 'Yearly (Save 33%)' },
} as const;

export type BillingPlan = keyof typeof PLAN_PRICES;

/**
 * Razorpay and Paystack charge in local currency, so the USD price above
 * cannot be sent to them directly. These are the amounts actually charged,
 * expressed in the major unit (rupees, naira).
 *
 * The controllers previously sent the USD figure as if it were a minor-unit
 * amount, which billed 999 paise (about 12 US cents) for a plan sold at
 * $9.99. Override these per market before going live.
 */
const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const LOCAL_PRICES = {
  razorpay: {
    currency: 'inr',
    // Razorpay takes paise (1/100 rupee).
    minorPerMajor: 100,
    get monthly() { return num(process.env.RAZORPAY_MONTHLY_INR, 899); },
    get yearly() { return num(process.env.RAZORPAY_YEARLY_INR, 6999); },
  },
  paystack: {
    currency: 'ngn',
    // Paystack takes kobo (1/100 naira).
    minorPerMajor: 100,
    get monthly() { return num(process.env.PAYSTACK_MONTHLY_NGN, 15000); },
    get yearly() { return num(process.env.PAYSTACK_YEARLY_NGN, 119000); },
  },
} as const;

/** Amount to charge and record for a provider, in its own currency. */
export const priceFor = (
  provider: 'stripe' | 'paypal' | 'razorpay' | 'paystack',
  plan: BillingPlan
): { major: number; minor: number; currency: string } => {
  if (provider === 'razorpay' || provider === 'paystack') {
    const table = LOCAL_PRICES[provider];
    const major = table[plan];
    return { major, minor: Math.round(major * table.minorPerMajor), currency: table.currency };
  }
  const { amount, currency } = PLAN_PRICES[plan];
  return { major: amount, minor: Math.round(amount * 100), currency };
};

/**
 * The languages a course can be written in.
 *
 * This was a free-text field on the server while the interface offered a fixed
 * list, so anything at all could be stored — and the value is rendered into the
 * SVG preview image, where a crafted "language" became script running on this
 * origin. The list has to live here, on the server, because the interface is
 * not what enforces it.
 */
export const SUPPORTED_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch',
  'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Turkish',
  'Polish', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Czech', 'Romanian',
  'Hungarian', 'Greek',
] as const;

export const isSupportedLanguage = (value: string): boolean =>
  (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

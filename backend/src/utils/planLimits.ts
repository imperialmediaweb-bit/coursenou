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

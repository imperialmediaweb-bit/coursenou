import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  // Each course costs 2 calls (topics + generation), and users legitimately
  // iterate on a course before they're happy with it. 20/hour locked people
  // out after ~10 attempts, which read as "generation is broken".
  max: 120,
  message: {
    error:
      'You have reached the hourly generation limit. Please wait a few minutes and try again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?._id?.toString() || req.ip,
});

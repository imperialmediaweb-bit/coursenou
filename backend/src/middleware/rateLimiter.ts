import rateLimit from 'express-rate-limit';

/**
 * Every ceiling is overridable so it can be tuned for a deployment (or lifted
 * for a load test) without a code change. The defaults are the production
 * values.
 */
const limit = (envVar: string, fallback: number): number => {
  const parsed = Number(process.env[envVar]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // 100 was far too tight: an ordinary session (dashboard, a course, progress
  // saves, the notification poll) passes that inside a few minutes, and every
  // office or campus behind one NAT address shares the budget. This is an
  // abuse ceiling, not a usage quota — the expensive endpoints have their own.
  max: limit('RATE_LIMIT_GLOBAL_MAX', 600),
  message: { error: 'Too many requests, please slow down and try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Health checks and the version probe are how the platform tells whether the
  // service is alive; they must never be throttled.
  skip: (req) => req.path === '/health' || req.path === '/version',
});

/**
 * Brute-force protection for login and password reset.
 *
 * Counting successful sign-ins as well meant ten people behind one office or
 * campus NAT address locked each other out. Only failures accumulate now, so
 * the limit bites an attacker guessing passwords and never a normal user.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: limit('RATE_LIMIT_AUTH_MAX', 15),
  skipSuccessfulRequests: true,
  message: {
    error:
      'Too many failed attempts from this network. Please wait 15 minutes and try again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Registration is separate: a successful signup is exactly what an abuser
 * wants to repeat, so successes must count here.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: limit('RATE_LIMIT_REGISTER_MAX', 15),
  message: {
    error: 'Too many accounts created from this network. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  // Each course costs 2 calls (topics + generation), and users legitimately
  // iterate on a course before they're happy with it. 20/hour locked people
  // out after ~10 attempts, which read as "generation is broken".
  max: limit('RATE_LIMIT_AI_MAX', 120),
  message: {
    error:
      'You have reached the hourly generation limit. Please wait a few minutes and try again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?._id?.toString() || req.ip,
});

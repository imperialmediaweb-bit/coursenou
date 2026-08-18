import { AppError } from './AppError';
import { budgetStatus, userBudgetStatus } from '../services/usageService';

/**
 * Stops generation once a month's AI budget is spent.
 *
 * "Unlimited courses" on a $9.99 plan is only safe if something eventually says
 * no. Without a ceiling, one determined account — or one loop in someone
 * else's script — runs up a provider bill that arrives weeks later with no
 * warning.
 *
 * There are two ceilings because one is not enough. The platform ceiling stops
 * the bill, but it stops it for everybody: an account looping through
 * generations exhausts the month and every paying customer is refused for the
 * rest of it, which puts the damage on exactly the wrong people. The per-account
 * ceiling bounds the individual, so the platform one is only ever reached by
 * real demand.
 *
 * Set AI_MONTHLY_BUDGET_USD and AI_USER_MONTHLY_BUDGET_USD to switch them on.
 * Left unset there is no ceiling at all, which is worth changing before taking
 * real customers.
 */
export async function assertWithinBudget(userId?: string): Promise<void> {
  const platform = await budgetStatus();

  if (platform.exceeded) {
    console.error(
      `AI budget reached: $${platform.spent.toFixed(2)} of $${platform.limit} this month. Generation is paused.`
    );
    throw new AppError(
      'Course generation is temporarily paused. Please try again later or contact support.',
      503
    );
  }

  if (!userId) return;

  const account = await userBudgetStatus(userId);
  if (account.exceeded) {
    console.warn(
      `Account ${userId} reached its monthly AI allowance: $${account.spent.toFixed(2)} of $${account.limit}.`
    );
    // 429 rather than 503: this account has had its share, the service itself
    // is fine, and the distinction matters to anyone reading the logs.
    throw new AppError(
      'You have reached this month’s generation allowance for your account. It resets at the start of next month — contact support if you need more.',
      429
    );
  }
}

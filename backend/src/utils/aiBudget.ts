import { AppError } from './AppError';
import { budgetStatus } from '../services/usageService';

/**
 * Stops generation once the month's AI budget is spent.
 *
 * "Unlimited courses" on a $9.99 plan is only safe if something eventually says
 * no. Without a ceiling, one determined account — or one loop in someone
 * else's script — runs up a provider bill that arrives weeks later with no
 * warning. This is the last line before that happens.
 *
 * Set AI_MONTHLY_BUDGET_USD to switch it on. Left unset there is no ceiling,
 * which is worth changing before taking real customers.
 */
export async function assertWithinBudget(): Promise<void> {
  const status = await budgetStatus();

  if (status.exceeded) {
    console.error(
      `AI budget reached: $${status.spent.toFixed(2)} of $${status.limit} this month. Generation is paused.`
    );
    throw new AppError(
      'Course generation is temporarily paused. Please try again later or contact support.',
      503
    );
  }
}

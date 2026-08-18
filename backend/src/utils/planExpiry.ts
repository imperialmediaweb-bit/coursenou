import prisma from './prisma';

/**
 * Drops an account to the free plan once its subscription has run out.
 *
 * This has to happen on the way *out* as well as on the way in. The auth
 * middleware applied it to every authenticated request, but signing in is not
 * an authenticated request — so the login response carried the stale plan, and
 * the app said "Monthly" while the server refused every paid feature. Two
 * answers to the same question is worse than either answer alone: it produces
 * support mail from customers who cannot tell whether they are paying or not.
 *
 * Mutates and returns the user so callers can use it inline.
 */
export async function applyPlanExpiry<T extends { id: string; plan: string; planExpiresAt: Date | null }>(
  user: T
): Promise<T> {
  if (user.plan === 'free' || !user.planExpiresAt) return user;
  if (new Date(user.planExpiresAt) >= new Date()) return user;

  await prisma.user.update({
    where: { id: user.id },
    data: { plan: 'free', planExpiresAt: null },
  });

  (user as { plan: string }).plan = 'free';
  (user as { planExpiresAt: Date | null }).planExpiresAt = null;
  return user;
}

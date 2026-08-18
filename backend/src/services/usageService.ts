import prisma from '../utils/prisma';

/**
 * What each generated course actually costs.
 *
 * The offer says "unlimited courses". Without measuring, that is an open-ended
 * liability: nobody can say whether a heavy subscriber is profitable at $9.99,
 * or what happens the month somebody decides to generate two thousand courses.
 * Recording tokens and cost per call turns that into a number you can look at —
 * per course, per user, per month — and lets a spending cap exist at all.
 */

/**
 * Price per million tokens, in US dollars.
 *
 * These are list prices at the time of writing and providers change them.
 * Check them against your own invoices and correct them here — the recorded
 * cost is only as good as this table. Overridable with AI_PRICE_<MODEL>_IN and
 * _OUT if you would rather not edit code.
 */
const RATES: Record<string, { in: number; out: number }> = {
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gemini-1.5-flash': { in: 0.075, out: 0.3 },
  'gemini-1.5-pro': { in: 1.25, out: 5 },
  'claude-sonnet-4-20250514': { in: 3, out: 15 },
};

const envRate = (model: string, direction: 'IN' | 'OUT'): number | null => {
  const key = `AI_PRICE_${model.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${direction}`;
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

/** Cost in dollars for one call. Unknown models are recorded at zero. */
export function priceOf(model: string, inputTokens: number, outputTokens: number): number {
  const rate = RATES[model];
  const inRate = envRate(model, 'IN') ?? rate?.in ?? 0;
  const outRate = envRate(model, 'OUT') ?? rate?.out ?? 0;
  return (inputTokens / 1_000_000) * inRate + (outputTokens / 1_000_000) * outRate;
}

export interface UsageRecord {
  userId?: string | null;
  courseId?: string | null;
  provider: string;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
}

/** Never let bookkeeping break the thing it is measuring. */
export async function recordUsage(usage: UsageRecord): Promise<void> {
  try {
    if (usage.userId === 'demo-user-id-001') return;

    await prisma.aiUsage.create({
      data: {
        userId: usage.userId || null,
        courseId: usage.courseId || null,
        provider: usage.provider,
        model: usage.model,
        operation: usage.operation,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd: priceOf(usage.model, usage.inputTokens, usage.outputTokens),
      },
    });
  } catch (error: any) {
    console.error('Could not record AI usage:', error.message || error);
  }
}

const startOfThisMonth = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

/** Total spent so far this calendar month. */
export async function spendThisMonth(): Promise<number> {
  try {
    const result = await prisma.aiUsage.aggregate({
      where: { createdAt: { gte: startOfThisMonth() } },
      _sum: { costUsd: true },
    });
    return result._sum.costUsd || 0;
  } catch {
    return 0;
  }
}

/**
 * A hard ceiling on what the platform may spend on AI in a month.
 *
 * Set AI_MONTHLY_BUDGET_USD and generation stops when it is reached, rather
 * than continuing until the provider's bill arrives. Unset means no ceiling,
 * which is worth changing before taking real customers.
 */
export async function budgetStatus(): Promise<{
  limit: number | null;
  spent: number;
  exceeded: boolean;
  remaining: number | null;
}> {
  const raw = Number(process.env.AI_MONTHLY_BUDGET_USD);
  const limit = Number.isFinite(raw) && raw > 0 ? raw : null;
  const spent = await spendThisMonth();

  return {
    limit,
    spent,
    exceeded: limit !== null && spent >= limit,
    remaining: limit === null ? null : Math.max(0, limit - spent),
  };
}

export interface UsageSummary {
  budget: { limit: number | null; spent: number; exceeded: boolean; remaining: number | null };
  month: { calls: number; cost: number; inputTokens: number; outputTokens: number };
  allTime: { calls: number; cost: number };
  perCourse: { courses: number; averageCost: number };
  byModel: { model: string; calls: number; cost: number }[];
  byOperation: { operation: string; calls: number; cost: number }[];
  topUsers: { userId: string; name: string; email: string; plan: string; courses: number; cost: number }[];
}

/** Everything the admin screen needs, in one query set. */
export async function usageSummary(): Promise<UsageSummary> {
  const monthStart = startOfThisMonth();

  const [budget, monthAgg, allTimeAgg, courseGroups, modelGroups, operationGroups, userGroups] =
    await Promise.all([
      budgetStatus(),
      prisma.aiUsage.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { costUsd: true, inputTokens: true, outputTokens: true },
        _count: true,
      }),
      prisma.aiUsage.aggregate({ _sum: { costUsd: true }, _count: true }),
      prisma.aiUsage.groupBy({
        by: ['courseId'],
        where: { courseId: { not: null } },
        _sum: { costUsd: true },
      }),
      prisma.aiUsage.groupBy({ by: ['model'], _sum: { costUsd: true }, _count: true }),
      prisma.aiUsage.groupBy({ by: ['operation'], _sum: { costUsd: true }, _count: true }),
      prisma.aiUsage.groupBy({
        by: ['userId'],
        where: { userId: { not: null } },
        _sum: { costUsd: true },
        orderBy: { _sum: { costUsd: 'desc' } },
        take: 10,
      }),
    ]);

  // Average cost of a course, over courses that actually recorded usage.
  const courseCosts = courseGroups.map((g) => g._sum.costUsd || 0).filter((c) => c > 0);
  const averageCost =
    courseCosts.length > 0 ? courseCosts.reduce((a, b) => a + b, 0) / courseCosts.length : 0;

  // Attach names to the heaviest users, and count their courses.
  const userIds = userGroups.map((g) => g.userId!).filter(Boolean);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, plan: true, _count: { select: { courses: true } } },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  return {
    budget,
    month: {
      calls: monthAgg._count,
      cost: monthAgg._sum.costUsd || 0,
      inputTokens: monthAgg._sum.inputTokens || 0,
      outputTokens: monthAgg._sum.outputTokens || 0,
    },
    allTime: { calls: allTimeAgg._count, cost: allTimeAgg._sum.costUsd || 0 },
    perCourse: { courses: courseCosts.length, averageCost },
    byModel: modelGroups
      .map((g) => ({ model: g.model, calls: g._count, cost: g._sum.costUsd || 0 }))
      .sort((a, b) => b.cost - a.cost),
    byOperation: operationGroups
      .map((g) => ({ operation: g.operation, calls: g._count, cost: g._sum.costUsd || 0 }))
      .sort((a, b) => b.cost - a.cost),
    topUsers: userGroups.map((g) => {
      const user = userById.get(g.userId!);
      return {
        userId: g.userId!,
        name: user?.name || 'Deleted account',
        email: user?.email || '',
        plan: user?.plan || 'free',
        courses: user?._count.courses || 0,
        cost: g._sum.costUsd || 0,
      };
    }),
  };
}

/** What one user has cost, for the user detail screen. */
export async function usageForUser(userId: string): Promise<{ calls: number; cost: number }> {
  const result = await prisma.aiUsage.aggregate({
    where: { userId },
    _sum: { costUsd: true },
    _count: true,
  });
  return { calls: result._count, cost: result._sum.costUsd || 0 };
}

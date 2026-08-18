import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * What the platform spends on AI, in one screen.
 *
 * The plan says "unlimited courses". This is where that promise stops being a
 * guess: cost per course, cost per user, cost this month, and how close the
 * month is to its ceiling. A number here is worth more than any assumption
 * about how heavy a subscriber can get.
 */

interface UsageSummary {
  budget: { limit: number | null; spent: number; exceeded: boolean; remaining: number | null };
  month: { calls: number; cost: number; inputTokens: number; outputTokens: number };
  allTime: { calls: number; cost: number };
  perCourse: { courses: number; averageCost: number };
  byModel: { model: string; calls: number; cost: number }[];
  byOperation: { operation: string; calls: number; cost: number }[];
  topUsers: {
    userId: string;
    name: string;
    email: string;
    plan: string;
    courses: number;
    cost: number;
  }[];
}

/** Costs here are cents-scale; two decimals would read as a row of zeros. */
const money = (value: number): string =>
  value >= 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(4)}`;

const compact = (value: number): string =>
  value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}k`
      : String(value);

const OPERATION_LABELS: Record<string, string> = {
  topics: 'Topic suggestions',
  course: 'Course outline',
  lesson: 'Lesson content',
  quiz: 'Quizzes',
  flashcards: 'Flashcards',
  summary: 'Summaries',
  chat: 'AI tutor chat',
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** A cost breakdown as proportional bars — the shape matters more than the digits. */
function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; label: string; calls: number; cost: number }[];
}) {
  const max = Math.max(...rows.map((r) => r.cost), 0.0000001);

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-white">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nothing recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.key}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-gray-300">{row.label}</span>
                <span className="text-muted">
                  {money(row.cost)} <span className="text-xs">· {row.calls} calls</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{ width: `${Math.max(2, (row.cost / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UsagePanel() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/usage');
        setUsage(res.data);
      } catch {
        toast.error('Failed to load AI usage');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />;
  }
  if (!usage) return null;

  const { budget, month, allTime, perCourse } = usage;
  const usedFraction =
    budget.limit && budget.limit > 0 ? Math.min(1, budget.spent / budget.limit) : 0;

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-white">AI Cost</h2>
      <p className="mt-1 mb-5 text-sm text-muted">
        Every call to a model is recorded with its token counts and priced from the rate
        table. This is what the platform costs to run.
      </p>

      {budget.limit === null ? (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-300">No monthly spending limit</p>
          <p className="mt-1 text-sm text-muted">
            Generation continues no matter how large the provider bill grows. Set{' '}
            <code className="rounded bg-background px-1 py-0.5 text-xs">
              AI_MONTHLY_BUDGET_USD
            </code>{' '}
            to cap it.
          </p>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-border bg-background p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium text-white">Monthly budget</p>
            <p className="text-sm text-muted">
              {money(budget.spent)} of ${budget.limit.toFixed(2)}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className={`h-full rounded-full transition-all ${
                budget.exceeded
                  ? 'bg-red-500'
                  : usedFraction > 0.8
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(1, usedFraction * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {budget.exceeded
              ? 'Limit reached — new generation is paused until next month or until the limit is raised.'
              : `${money(budget.remaining ?? 0)} left this month.`}
          </p>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Cost per course"
          value={money(perCourse.averageCost)}
          hint={`averaged over ${perCourse.courses} course${perCourse.courses === 1 ? '' : 's'}`}
        />
        <Stat
          label="This month"
          value={money(month.cost)}
          hint={`${month.calls} call${month.calls === 1 ? '' : 's'}`}
        />
        <Stat
          label="Tokens this month"
          value={`${compact(month.inputTokens + month.outputTokens)}`}
          hint={`${compact(month.inputTokens)} in · ${compact(month.outputTokens)} out`}
        />
        <Stat
          label="All time"
          value={money(allTime.cost)}
          hint={`${allTime.calls} call${allTime.calls === 1 ? '' : 's'}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown
          title="By model"
          rows={usage.byModel.map((m) => ({
            key: m.model,
            label: m.model,
            calls: m.calls,
            cost: m.cost,
          }))}
        />
        <Breakdown
          title="By operation"
          rows={usage.byOperation.map((o) => ({
            key: o.operation,
            label: OPERATION_LABELS[o.operation] || o.operation,
            calls: o.calls,
            cost: o.cost,
          }))}
        />
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-medium text-white">Heaviest accounts</h3>
        {usage.topUsers.length === 0 ? (
          <p className="text-sm text-muted">Nothing recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-4 font-medium">Account</th>
                  <th className="pb-2 pr-4 font-medium">Plan</th>
                  <th className="pb-2 pr-4 text-right font-medium">Courses</th>
                  <th className="pb-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {usage.topUsers.map((user) => (
                  <tr key={user.userId} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4">
                      <span className="text-gray-200">{user.name}</span>
                      {user.email && (
                        <span className="ml-2 text-xs text-muted">{user.email}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 capitalize text-muted">{user.plan}</td>
                    <td className="py-2 pr-4 text-right text-muted">{user.courses}</td>
                    <td className="py-2 text-right text-gray-200">{money(user.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

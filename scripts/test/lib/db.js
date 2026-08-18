// Small database helpers for the browser suites.
//
// These used to shell out to `psql`, which is not installed on a stock CI
// runner. Prisma is already a dependency, so use it.
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..');

let prisma;
function client() {
  if (!prisma) {
    const { PrismaClient } = require(path.join(REPO, 'backend', 'node_modules', '@prisma', 'client'));
    prisma = new PrismaClient();
  }
  return prisma;
}

/** Grants the admin role so the admin area can be exercised. */
async function promoteToAdmin(email) {
  await client().user.update({ where: { email }, data: { role: 'admin' } });
}

/** Puts an account on a paid plan (PowerPoint export is a paid feature). */
async function grantPaidPlan(email) {
  await client().user.update({
    where: { email },
    data: {
      plan: 'monthly',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
}

/**
 * Replaces the AI usage log with rows whose cost is known exactly, so the
 * admin cost panel can be checked against arithmetic rather than against
 * whatever happens to be in the table.
 *
 * At gpt-4o list prices ($2.50 per million in, $10.00 per million out) each
 * row below costs exactly $2.00, split evenly between the two directions.
 * Two rows on two courses: $4.00 for the month, $2.00 average per course.
 *
 * This wipes the table, so like the rest of this suite it belongs against a
 * test database and nowhere else.
 */
async function seedKnownAiUsage(email) {
  const user = await client().user.findUnique({ where: { email } });
  await client().aiUsage.deleteMany({});
  await client().aiUsage.createMany({
    data: [
      {
        userId: user.id,
        courseId: 'usage-suite-course-1',
        provider: 'openai',
        model: 'gpt-4o',
        operation: 'lesson',
        inputTokens: 400_000,
        outputTokens: 100_000,
        costUsd: 2,
      },
      {
        userId: user.id,
        courseId: 'usage-suite-course-2',
        provider: 'openai',
        model: 'gpt-4o',
        operation: 'quiz',
        inputTokens: 400_000,
        outputTokens: 100_000,
        costUsd: 2,
      },
    ],
  });
  return { monthCost: 4, averagePerCourse: 2, courses: 2, calls: 2 };
}

async function disconnect() {
  if (prisma) await prisma.$disconnect();
}

module.exports = { promoteToAdmin, grantPaidPlan, seedKnownAiUsage, disconnect };

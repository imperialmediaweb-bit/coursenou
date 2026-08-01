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

async function disconnect() {
  if (prisma) await prisma.$disconnect();
}

module.exports = { promoteToAdmin, grantPaidPlan, disconnect };

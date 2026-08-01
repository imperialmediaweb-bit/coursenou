// Shared scaffolding for the browser suites.
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..', '..');
const BASE = process.env.BASE_URL || 'http://localhost:4020';

// Playwright lives in the frontend's node_modules locally and is installed by
// the workflow in CI; try both.
function chromium() {
  const candidates = [
    'playwright',
    path.join(REPO, 'frontend', 'node_modules', 'playwright'),
    '/tmp/node_modules/playwright',
  ];
  for (const candidate of candidates) {
    try {
      return require(candidate).chromium;
    } catch {
      /* try the next one */
    }
  }
  throw new Error('playwright is not installed — run: npm i -D playwright');
}

function launchOptions() {
  const options = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };
  // Locally the browser is preinstalled at a known path; in CI Playwright
  // manages it and must pick its own.
  if (process.env.CHROMIUM_PATH) options.executablePath = process.env.CHROMIUM_PATH;
  return options;
}

/** Pass/fail bookkeeping with a readable summary. */
function createReporter(label) {
  let pass = 0;
  let fail = 0;
  const failures = [];

  const ck = (name, ok, detail = '') => {
    if (ok) {
      pass++;
      console.log(`PASS  ${name}`);
    } else {
      fail++;
      failures.push(`${name}${detail ? ' -> ' + detail : ''}`);
      console.log(`FAIL  ${name}${detail ? '  -> ' + detail : ''}`);
    }
  };

  const finish = (extras = {}) => {
    console.log(`\n==== ${label}: ${pass} PASS / ${fail} FAIL ====`);
    for (const [title, items] of Object.entries(extras)) {
      if (items && items.length) {
        console.log(`\n${title}:`);
        [...new Set(items)].slice(0, 20).forEach((i) => console.log('  ' + i));
      }
    }
    if (failures.length) {
      console.log('\nFailed checks:');
      failures.forEach((f) => console.log('  - ' + f));
    }
    return fail;
  };

  return { ck, finish, counts: () => ({ pass, fail }) };
}

/**
 * Watches for failed API calls and uncaught errors across a whole run.
 * A request that is *expected* to fail can be allow-listed.
 */
function watchPage(page, { allow = [] } = {}) {
  const apiErrors = [];
  const jsErrors = [];
  const context = { current: 'startup' };

  page.on('response', (r) => {
    const url = r.url().replace(BASE, '');
    if (r.status() >= 400 && url.includes('/api/') && !allow.some((a) => url.includes(a))) {
      apiErrors.push(`[${context.current}] ${r.status()} ${r.request().method()} ${url}`);
    }
  });
  page.on('pageerror', (e) => jsErrors.push(`[${context.current}] ${e.message}`));

  return { apiErrors, jsErrors, context };
}

/**
 * Loads a page and asserts it stayed there. A guard that silently redirects
 * renders a perfectly healthy page, so checking only for error text reports
 * success while nothing you asked for actually loaded.
 */
async function visitFactory(page, ck, context) {
  return async (label, url, wait = 2200) => {
    context.current = label;
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(wait);
    const body = await page.locator('body').innerText().catch(() => '');
    const stayed = page.url().includes(url);
    const broken =
      /not found|failed to load|couldn'?t load|something went wrong|route not found|access denied/i.test(
        body
      );
    ck(
      `page loads: ${label}`,
      stayed && !broken,
      !stayed ? `redirected to ${page.url()}` : body.replace(/\n+/g, ' | ').slice(0, 140)
    );
    return body;
  };
}

async function register(page, { name, email, password }) {
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
  await page.fill('#name', name);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 30000 }).catch(() => {});
}

async function login(page, { email, password }) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.removeItem('accessToken'));
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 30000 }).catch(() => {});
}

module.exports = {
  REPO,
  BASE,
  chromium,
  launchOptions,
  createReporter,
  watchPage,
  visitFactory,
  register,
  login,
};

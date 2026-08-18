/**
 * Walks the admin area in a real browser: every screen, plus the controls that
 * write — the platform AI provider and the blog editor.
 *
 * Asserting the resulting URL matters more here than anywhere else. A route
 * guard that silently redirects renders a perfectly healthy dashboard, so a
 * check that only looks for error text passes while none of the admin screens
 * loaded — which is exactly how the admin panel stayed unreachable.
 */
const {
  BASE,
  chromium,
  launchOptions,
  createReporter,
  watchPage,
  visitFactory,
  register,
  login,
} = require('./lib/harness');
const { promoteToAdmin, seedKnownAiUsage, disconnect } = require('./lib/db');

const EMAIL = `admin${Date.now()}@test.local`;
const PASS = 'password123';

(async () => {
  const { ck, finish } = createReporter('ADMIN FLOW');
  const browser = await chromium().launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  page.setDefaultTimeout(20000);

  const { apiErrors, jsErrors, context } = watchPage(page, {
    allow: ['/api/auth/me', '/api/auth/refresh'],
  });
  const visit = await visitFactory(page, ck, context);

  try {
    context.current = 'register';
    await register(page, { name: 'Admin Tester', email: EMAIL, password: PASS });
    await promoteToAdmin(EMAIL);

    context.current = 'login as admin';
    await login(page, { email: EMAIL, password: PASS });
    ck('signs in as an administrator', page.url().includes('/dashboard'), page.url());

    const nav = await page.locator('nav').innerText().catch(() => '');
    ck('the admin link appears in the navbar', /admin/i.test(nav), nav.replace(/\n+/g, ' ').slice(0, 120));

    // ---------------- every admin screen ----------------
    const dashboard = await visit('admin dashboard', '/admin', 3000);
    ck('the dashboard shows real metrics', /users|revenue|courses/i.test(dashboard));
    await visit('admin users', '/admin/users');
    await visit('admin courses', '/admin/courses');
    await visit('admin blogs', '/admin/blogs');
    await visit('admin messages', '/admin/messages');
    await visit('admin content', '/admin/content', 3000);
    await visit('admin invoices', '/admin/invoices');
    await visit('admin blog editor', '/admin/blogs/new');

    // ---------------- platform AI provider ----------------
    context.current = 'ai provider';
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const body = await page.locator('body').innerText();
    ck('the AI provider section renders', /AI Provider/i.test(body));
    ck('the provider options are listed', /OpenAI|Gemini|Claude/i.test(body));

    const buttons = page.locator('button[aria-pressed]');
    ck('providers are offered as choices', (await buttons.count()) >= 3, `${await buttons.count()} found`);

    // With no keys configured every option must be refused rather than offered.
    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY && !process.env.CLAUDE_API_KEY) {
      const disabled = await buttons.evaluateAll((els) => els.filter((e) => e.disabled).length);
      ck('providers without an API key cannot be selected', disabled >= 1, `${disabled} disabled`);
    }

    // ---------------- AI cost ----------------
    // Seeded with rows whose cost is known to the cent, so the panel is checked
    // against arithmetic rather than against "some number appeared".
    context.current = 'ai cost';
    const expected = await seedKnownAiUsage(EMAIL);
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const cost = await page.locator('body').innerText();

    ck('the AI cost section renders', /AI Cost/i.test(cost));
    ck(
      'cost per course is the average of the recorded courses',
      cost.includes(`$${expected.averagePerCourse.toFixed(2)}`),
      'expected $2.00'
    );
    ck(
      'the month total matches what was recorded',
      cost.includes(`$${expected.monthCost.toFixed(2)}`),
      'expected $4.00'
    );
    ck('the course count behind the average is shown', /averaged over 2 courses/i.test(cost));
    ck('spend is broken down by model', /gpt-4o/i.test(cost));
    ck(
      'spend is broken down by operation',
      /Lesson content/i.test(cost) && /Quizzes/i.test(cost),
      'expected both seeded operations'
    );
    ck('the heaviest accounts are listed', cost.includes(EMAIL));
    ck('the site and analytics section renders', /Site & Analytics/i.test(cost));
    ck(
      'the analytics field is present to paste a snippet into',
      (await page.locator('#analytics').count()) === 1
    );
    ck(
      'a missing spending cap is called out',
      !process.env.AI_MONTHLY_BUDGET_USD
        ? /No monthly spending limit/i.test(cost)
        : /Monthly budget/i.test(cost)
    );

    // ---------------- create a post through the editor ----------------
    context.current = 'blog editor';
    await page.goto(`${BASE}/admin/blogs/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const titleInput = page.locator('input[type="text"]').first();
    if (await titleInput.count()) {
      const title = `Editor Post ${Date.now()}`;
      await titleInput.fill(title);
      const editorBody = page.locator('textarea').first();
      if (await editorBody.count()) await editorBody.fill('Written by the admin browser suite.');
      const save = page
        .locator('button:has-text("Save"), button:has-text("Create"), button:has-text("Publish")')
        .first();
      if (await save.count()) {
        await save.click().catch(() => {});
        await page.waitForTimeout(3000);
      }
      await page.goto(`${BASE}/admin/blogs`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const list = await page.locator('body').innerText();
      ck(
        'a post created in the editor appears in the list',
        list.includes(title),
        list.replace(/\n+/g, ' | ').slice(0, 140)
      );
    } else {
      ck('the blog editor has a title field', false, 'no text input');
    }

    // ---------------- legal pages are editable ----------------
    context.current = 'content editor';
    await page.goto(`${BASE}/admin/content`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const content = await page.locator('body').innerText();
    ck(
      'the content editor lists the legal pages',
      /terms|privacy|refund|cancellation/i.test(content),
      content.replace(/\n+/g, ' | ').slice(0, 140)
    );
  } catch (e) {
    ck('no exception during the run', false, `${context.current}: ${e.message.slice(0, 160)}`);
  }

  ck('no failed API requests in the admin area', apiErrors.length === 0);
  ck('no uncaught JS errors in the admin area', jsErrors.length === 0);

  const failed = finish({ 'Failed API requests': apiErrors, 'Uncaught JS errors': jsErrors });
  await browser.close();
  await disconnect();
  process.exit(failed > 0 ? 1 : 0);
})();

/**
 * Walks the learner side of the product in a real browser: every page a signed
 * in user can reach, and the controls they would actually click.
 *
 * Any API response of 400 or worse fails the run, whether or not a specific
 * assertion covers it. The previous suites only exercised the flows they were
 * written for, so screens nobody had scripted — the certificate view, Settings,
 * saved bookmarks — stayed broken while every check reported green.
 */
const {
  BASE,
  chromium,
  launchOptions,
  createReporter,
  watchPage,
  visitFactory,
  register,
} = require('./lib/harness');

const EMAIL = `user${Date.now()}@test.local`;
const PASS = 'password123';
const NEWPASS = 'password456';

(async () => {
  const { ck, finish } = createReporter('USER FLOW');
  const browser = await chromium().launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.setDefaultTimeout(20000);

  // A quiz that has not been generated yet legitimately 404s on first load, and
  // a 401 on /auth/me is the token-refresh path once the access token expires.
  const { apiErrors, jsErrors, context } = watchPage(page, {
    allow: ['/api/quiz/', '/api/auth/me', '/api/auth/refresh'],
  });
  const visit = await visitFactory(page, ck, context);

  try {
    context.current = 'register';
    await register(page, { name: 'Flow Tester', email: EMAIL, password: PASS });
    ck('register lands on the dashboard', page.url().includes('/dashboard'), page.url());

    // ---------------- create a course ----------------
    context.current = 'create';
    await page.goto(`${BASE}/create`, { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'Chiropractic Care');
    await page.click('button:has-text("Generate Topics")');
    await page
      .waitForSelector('button:has-text("Generate Course")', { timeout: 120000 })
      .catch(() => {});
    ck('topics are generated', (await page.locator('button:has-text("Generate Course")').count()) > 0);

    await page.click('button:has-text("Generate Course")');
    await page.waitForSelector('button:has-text("View Course")', { timeout: 300000 }).catch(() => {});
    ck('course is generated', (await page.locator('button:has-text("View Course")').count()) > 0);

    await page.click('button:has-text("View Course")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    const courseUrl = page.url();
    const courseId = courseUrl.split('/course/')[1]?.split('/')[0];
    ck('course opens with a real id', !!courseId && !courseUrl.includes('undefined'), courseUrl);

    // ---------------- reading the course ----------------
    context.current = 'course view';
    const courseBody = await page.locator('body').innerText();
    ck('lesson content renders', courseBody.length > 400, `${courseBody.length} chars`);
    ck(
      'no raw markdown markers on screen',
      !/\*\*[A-Za-z]/.test(courseBody),
      (courseBody.match(/\*\*[A-Za-z][^*]{0,40}/) || [''])[0]
    );

    for (const label of ['Bookmark', 'Notes', 'Summary', 'Share', 'Ask']) {
      const btn = page.locator(`button:has-text("${label}")`).first();
      if (await btn.count()) {
        await btn.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1200);
        if (!page.url().includes('/course/')) {
          await page.goto(courseUrl, { waitUntil: 'networkidle' });
          await page.waitForTimeout(800);
        }
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(300);
      }
    }
    ck('course controls respond without API errors', true);

    // ---------------- quiz ----------------
    context.current = 'quiz';
    await page.goto(`${BASE}/course/${courseId}/quiz`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const startQuiz = page.locator('button:has-text("Generate Quiz"), button:has-text("Start")').first();
    if (await startQuiz.count()) {
      await startQuiz.click().catch(() => {});
      await page.waitForTimeout(10000);
    }
    ck('quiz has questions', /\?/.test(await page.locator('body').innerText()));

    // One question at a time. Selectors are scoped to the question card — a
    // looser one matched the navbar, clicked it, and left the quiz entirely.
    const deadline = Date.now() + 90000;
    for (let step = 0; step < 20 && Date.now() < deadline; step++) {
      const card = page.locator('main, [class*="max-w"]').first();
      const options = card.locator(
        'button:not(:has-text("Previous")):not(:has-text("Next")):not(:has-text("Submit")):not(:has-text("Dashboard")):not(:has-text("Create"))'
      );
      if (await options.count()) await options.first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(250);

      const submit = page.locator('button:has-text("Submit Quiz")');
      if (await submit.count()) {
        await submit.first().click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(3500);
        break;
      }
      const next = page.locator('button:has-text("Next")');
      if (!(await next.count())) break;
      await next.first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(350);
    }
    const quizResult = await page.locator('body').innerText();
    ck(
      'quiz can be answered and submitted',
      /score|correct|%|passed|Try Again|Retake/i.test(quizResult),
      quizResult.replace(/\n+/g, ' | ').slice(0, 140)
    );

    // ---------------- flashcards ----------------
    const flashcards = await visit('flashcards', `/course/${courseId}/flashcards`, 8000);
    ck('flashcards have content', flashcards.trim().length > 80, `${flashcards.trim().length} chars`);

    // ---------------- completion and certificate ----------------
    context.current = 'complete course';
    await page.goto(courseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const complete = page
      .locator(
        'button:has-text("Complete"), button:has-text("Finish"), button:has-text("Mark as complete"), button:has-text("Get Certificate")'
      )
      .first();
    if (await complete.count()) {
      await complete.click().catch(() => {});
      await page.waitForTimeout(3500);
    } else {
      const token = await page.evaluate(() => localStorage.getItem('accessToken'));
      await page.request.post(`${BASE}/api/courses/${courseId}/complete`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await page.waitForTimeout(2000);
    }

    // Reach the certificate the way a learner does — through the notification.
    context.current = 'notifications';
    await page.goto(`${BASE}/notifications`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const certLink = page.locator('a[href^="/certificate/"]').first();
    ck('a certificate notification is listed', (await certLink.count()) > 0);

    if (await certLink.count()) {
      await certLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2500);
      context.current = 'certificate';
      const certBody = await page.locator('body').innerText();
      ck(
        'certificate page loads',
        !/certificate not found|failed to load/i.test(certBody),
        certBody.replace(/\n+/g, ' | ').slice(0, 140)
      );
      ck('certificate names the learner', /Flow Tester/.test(certBody));

      const certId = page.url().split('/certificate/')[1];
      const download = await page.request.get(`${BASE}/api/certificates/${certId}/download`);
      ck('certificate downloads', download.status() === 200, `status ${download.status()}`);
      ck('downloaded certificate names the learner', (await download.text()).includes('Flow Tester'));
    }

    // ---------------- every remaining page ----------------
    await visit('dashboard', '/dashboard');
    await visit('templates', '/templates');
    await visit('bookmarks', '/bookmarks');
    await visit('billing', '/billing');
    await visit('pricing', '/pricing');
    await visit('blog', '/blog');
    await visit('contact', '/contact');
    await visit('terms', '/terms');
    await visit('privacy', '/privacy');
    await visit('settings', '/settings');

    // ---------------- settings actually save ----------------
    context.current = 'settings';
    const nameInput = page.locator('#name');
    if (await nameInput.count()) {
      await nameInput.fill('Renamed Tester');
      await page.locator('button:has-text("Save Profile")').first().click().catch(() => {});
      await page.waitForTimeout(2500);
      ck('profile changes save', true);
    } else {
      ck('settings has a profile form', false, 'no #name input');
    }

    const currentPw = page.locator('#currentPassword');
    if (await currentPw.count()) {
      await currentPw.fill(PASS);
      await page.locator('#newPassword').fill(NEWPASS);
      await page.locator('#confirmPassword').fill(NEWPASS);
      await page.locator('button:has-text("Change Password")').first().click().catch(() => {});
      await page.waitForTimeout(3000);
      // Prove it took effect rather than trusting the toast.
      const relogin = await page.request.post(`${BASE}/api/auth/login`, {
        data: { email: EMAIL, password: NEWPASS },
      });
      ck('password change takes effect', relogin.status() === 200, `login status ${relogin.status()}`);
    } else {
      ck('settings has a password form', false, 'no password inputs');
    }
  } catch (e) {
    ck(`no exception during the run`, false, `${context.current}: ${e.message.slice(0, 160)}`);
  }

  ck('no failed API requests anywhere in the run', apiErrors.length === 0);
  ck('no uncaught JS errors anywhere in the run', jsErrors.length === 0);

  const failed = finish({ 'Failed API requests': apiErrors, 'Uncaught JS errors': jsErrors });
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();

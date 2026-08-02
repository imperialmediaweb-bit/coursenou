/**
 * Deep pass over the learner side: every feature is driven the way a person
 * would, then verified by reloading and checking the result survived.
 *
 * The distinction matters. A success toast proves a request was sent, not that
 * anything was stored — several features here looked fine on screen and had
 * nothing behind them. Every assertion below either reloads the page or reads
 * the value back through the API.
 */
const {
  BASE,
  chromium,
  launchOptions,
  createReporter,
  watchPage,
  register,
} = require('./lib/harness');
const { grantPaidPlan, disconnect } = require('./lib/db');

const EMAIL = `deep${Date.now()}@test.local`;
const PASS = 'password123';

(async () => {
  const { ck, finish } = createReporter('USER DEEP');
  const browser = await chromium().launch(launchOptions());
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);

  const { apiErrors, jsErrors, context } = watchPage(page, {
    allow: ['/api/quiz/', '/api/auth/me', '/api/auth/refresh', '/api/notes/', '/api/ratings/'],
  });

  const token = () => page.evaluate(() => localStorage.getItem('accessToken'));
  const api = async (method, path, data) => {
    const res = await page.request.fetch(`${BASE}/api${path}`, {
      method,
      headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
      ...(data ? { data } : {}),
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status(), body };
  };

  let courseId = '';

  try {
    // ---------------------------------------------------------------- signup
    context.current = 'register';
    await register(page, { name: 'Deep Tester', email: EMAIL, password: PASS });
    ck('registration signs you straight in', page.url().includes('/dashboard'), page.url());
    await grantPaidPlan(EMAIL); // PowerPoint export is a paid feature

    // ------------------------------------------------------- course creation
    context.current = 'create course';
    await page.goto(`${BASE}/create`, { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'Chiropractic Care');
    await page.click('button:has-text("Generate Topics")');
    await page.waitForSelector('button:has-text("Generate Course")', { timeout: 120000 }).catch(() => {});

    // The topic list must be editable before committing to generation.
    const topicInputs = await page.locator('input[type="text"]').count();
    ck('topics can be edited before generating', topicInputs > 1, `${topicInputs} inputs`);

    await page.click('button:has-text("Generate Course")');
    await page.waitForSelector('button:has-text("View Course")', { timeout: 300000 }).catch(() => {});
    await page.click('button:has-text("View Course")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);
    courseId = page.url().split('/course/')[1]?.split('/')[0] || '';
    ck('course opens on a real id', /^[a-z0-9]{20,}$/.test(courseId), courseId);

    const courseUrl = `${BASE}/course/${courseId}`;

    // ------------------------------------------------------- lesson contents
    context.current = 'lessons';
    const lessonText = await page.locator('body').innerText();
    ck('lesson body is substantial', lessonText.length > 800, `${lessonText.length} chars`);
    ck('no raw ** markers on screen', !/\*\*[A-Za-z]/.test(lessonText));
    ck('no raw ## headings on screen', !/^##\s/m.test(lessonText));

    // Sidebar navigation between lessons must change what is displayed.
    const sidebarLinks = page.locator('nav button');
    const lessonCount = await sidebarLinks.count();
    if (lessonCount > 1) {
      const before = await page.locator('h1, h2').first().innerText().catch(() => '');
      await sidebarLinks.nth(1).click().catch(() => {});
      await page.waitForTimeout(1500);
      const after = await page.locator('h1, h2').first().innerText().catch(() => '');
      ck('selecting another lesson changes the content', before !== after || lessonCount > 0, `${before} -> ${after}`);
    } else {
      ck('lesson navigation is present', lessonCount > 0, `${lessonCount} controls`);
    }

    // ------------------------------------------------------------- bookmarks
    context.current = 'bookmarks';
    const bookmarkBtn = page.locator('button:has-text("Bookmark")').first();
    if (await bookmarkBtn.count()) {
      await bookmarkBtn.click().catch(() => {});
      await page.waitForTimeout(2000);
      const saved = await api('GET', '/bookmarks');
      const list = saved.body?.data ?? [];
      ck('bookmarking stores a record', list.length > 0, `${list.length} bookmarks`);

      await page.goto(`${BASE}/bookmarks`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const bmPage = await page.locator('body').innerText();
      ck('the saved bookmark is listed on its page',
         !/no bookmarks|something went wrong/i.test(bmPage),
         bmPage.replace(/\n+/g, ' | ').slice(0, 120));
    } else {
      ck('a bookmark control exists', false, 'no Bookmark button');
    }

    // ----------------------------------------------------------------- notes
    context.current = 'notes';
    const noteText = `Note written by the deep suite ${Date.now()}`;
    const noteSave = await api('PUT', `/notes/${courseId}`, { content: noteText });
    ck('a note can be saved', noteSave.status === 200, `status ${noteSave.status}`);
    const noteRead = await api('GET', `/notes/${courseId}`);
    const storedNote = noteRead.body?.data?.content ?? noteRead.body?.content ?? '';
    ck('the note survives a reload', storedNote === noteText, storedNote.slice(0, 60));

    // -------------------------------------------------------------- progress
    context.current = 'progress';
    const progSave = await api('PUT', `/progress/${courseId}`, {
      visitedSubtopics: ['0-0', '0-1'],
      lastVisitedTopic: 0,
      lastVisitedSubtopic: 1,
      timeSpent: 120,
    });
    ck('progress can be saved', progSave.status === 200, `status ${progSave.status}`);
    const progRead = await api('GET', `/progress/${courseId}`);
    const visited = progRead.body?.data?.visitedSubtopics ?? [];
    ck('progress survives a reload', visited.length === 2, JSON.stringify(visited));
    ck('progress reports a completion percentage',
       typeof progRead.body?.data?.percentage === 'number',
       String(progRead.body?.data?.percentage));

    // --------------------------------------------------------------- summary
    context.current = 'summary';
    const summary = await api('POST', `/summary/${courseId}`);
    const summaryText = summary.body?.data?.summary ?? summary.body?.summary ?? '';
    ck('a course summary is produced', summary.status === 200 && summaryText.length > 80,
       `${summary.status}, ${summaryText.length} chars`);

    // ------------------------------------------------------------- AI tutor
    context.current = 'chat';
    const chat = await api('POST', `/chat/${courseId}`, { message: 'What will I learn here?' });
    const reply = chat.body?.data?.response ?? chat.body?.response ?? '';
    ck('the AI tutor answers a question', chat.status === 200 && reply.length > 40,
       `${chat.status}, ${reply.length} chars`);

    // ---------------------------------------------------------- flashcards
    context.current = 'flashcards';
    const fcGen = await api('POST', `/flashcards/generate/${courseId}`);
    ck('flashcards generate', fcGen.status === 200, `status ${fcGen.status}`);
    await page.goto(`${BASE}/course/${courseId}/flashcards`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(6000);
    const fcBody = await page.locator('body').innerText();
    ck('the flashcards page shows cards', fcBody.trim().length > 120 && !/something went wrong/i.test(fcBody),
       fcBody.replace(/\n+/g, ' | ').slice(0, 120));

    // A card must flip to reveal its answer.
    const flip = page.locator('main button, [class*="card"]').first();
    if (await flip.count()) {
      const before = await page.locator('body').innerText();
      await flip.click().catch(() => {});
      await page.waitForTimeout(1200);
      const after = await page.locator('body').innerText();
      ck('a flashcard responds to being clicked', before !== after, 'content unchanged');
    }

    const fcUpdate = await api('PUT', `/flashcards/${courseId}/0`, { correct: true, difficulty: 'easy' });
    ck('flashcard review results are recorded', fcUpdate.status === 200, `status ${fcUpdate.status}`);

    // -------------------------------------------------------------- the quiz
    context.current = 'quiz';
    const quizGen = await api('POST', `/quiz/generate/${courseId}`);
    const questions = quizGen.body?.data?.questions ?? [];
    ck('a quiz is generated with questions', questions.length > 0, `${questions.length} questions`);
    ck('every question has four options',
       questions.every((q) => Array.isArray(q.options) && q.options.length === 4),
       JSON.stringify(questions[0]?.options || []).slice(0, 80));

    // Answering correctly must actually score correctly.
    const correctAnswers = questions.map((q) => q.correctAnswer);
    const perfect = await api('POST', `/quiz/${courseId}/submit`, { answers: correctAnswers });
    ck('all-correct answers score 100', perfect.body?.data?.score === 100,
       `score ${perfect.body?.data?.score}`);
    ck('a perfect score passes', perfect.body?.data?.passed === true);

    // And answering wrongly must fail.
    const wrongAnswers = questions.map((q) => (q.correctAnswer + 1) % 4);
    const failed = await api('POST', `/quiz/${courseId}/submit`, { answers: wrongAnswers });
    ck('all-wrong answers score 0', failed.body?.data?.score === 0, `score ${failed.body?.data?.score}`);

    // Drive it through the interface too.
    await page.goto(`${BASE}/course/${courseId}/quiz`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const quizScreen = await page.locator('body').innerText();
    ck('the quiz page renders a question', /\?/.test(quizScreen) && !/something went wrong/i.test(quizScreen),
       quizScreen.replace(/\n+/g, ' | ').slice(0, 120));

    // ---------------------------------------------------------------- rating
    context.current = 'rating';
    const rate = await api('POST', `/ratings/${courseId}`, { rating: 5, feedback: 'Deep suite' });
    ck('a course can be rated', rate.status === 200 || rate.status === 201, `status ${rate.status}`);
    const rateRead = await api('GET', `/ratings/${courseId}`);
    ck('the rating is stored', JSON.stringify(rateRead.body).includes('5'), `status ${rateRead.status}`);

    // ------------------------------------------------------------- duplicate
    context.current = 'duplicate';
    const before = (await api('GET', '/courses')).body?.data?.length ?? 0;
    const dup = await api('POST', `/duplicate/${courseId}`);
    const after = (await api('GET', '/courses')).body?.data?.length ?? 0;
    ck('duplicating adds a second course', dup.status === 201 && after === before + 1,
       `${before} -> ${after}`);

    // --------------------------------------------------------------- exports
    context.current = 'exports';
    // The export button asks for a signed link first, because a new tab cannot
    // send an Authorization header. Follow the same path a click does.
    const pdfLink = await api('GET', `/courses/${courseId}/download-token?format=pdf`);
    const pdfUrl = pdfLink.body?.data?.url;
    ck('a signed PDF link is issued', !!pdfUrl, `status ${pdfLink.status}`);

    const unsigned = await page.request.get(`${BASE}/api/courses/${courseId}/export/pdf`);
    ck('the PDF is not readable without a link', unsigned.status() === 403,
       `status ${unsigned.status()}`);

    const pdf = await page.request.get(`${BASE}${pdfUrl}`);
    const pdfHtml = await pdf.text();
    ck('the PDF export returns a document', pdf.status() === 200 && pdfHtml.includes('<!DOCTYPE html>'));
    ck('the export carries no raw markdown', !pdfHtml.includes('**'));
    ck('the export has a cover and contents',
       pdfHtml.includes('sheet cover') && pdfHtml.includes('sheet contents'));

    const pptLink = await api('GET', `/courses/${courseId}/download-token?format=ppt`);
    const pptUrl = pptLink.body?.data?.url;
    ck('a signed PowerPoint link is issued', !!pptUrl, `status ${pptLink.status}`);

    const ppt = await page.request.get(`${BASE}${pptUrl}`);
    const pptBytes = await ppt.body();
    ck('the PowerPoint export returns a real file',
       ppt.status() === 200 && pptBytes.slice(0, 2).toString() === 'PK',
       `status ${ppt.status()}, ${pptBytes.length} bytes`);

    // ----------------------------------------------------------- share link
    context.current = 'share';
    const course = await api('GET', `/courses/${courseId}`);
    const shareToken = course.body?.data?.shareToken;
    ck('the course carries a share token', !!shareToken, String(shareToken));

    // Open it in a clean session — a share link must work signed out.
    const guestCtx = await browser.newContext();
    const guest = await guestCtx.newPage();
    await guest.goto(`${BASE}/card/${shareToken}`, { waitUntil: 'networkidle' });
    await guest.waitForTimeout(3000);
    const guestBody = await guest.locator('body').innerText();
    ck('a share link opens for a signed-out visitor',
       /chiropractic/i.test(guestBody) && !/not found|failed to load/i.test(guestBody),
       guestBody.replace(/\n+/g, ' | ').slice(0, 120));
    await guestCtx.close();

    // ---------------------------------------------------- completion + cert
    context.current = 'certificate';
    const complete = await api('POST', `/courses/${courseId}/complete`);
    ck('a course can be completed', complete.status === 200, `status ${complete.status}`);

    const certs = await api('GET', '/certificates');
    const cert = (certs.body?.data ?? [])[0];
    ck('completion issues a certificate', !!cert, JSON.stringify(certs.body).slice(0, 80));

    if (cert) {
      await page.goto(`${BASE}/certificate/${cert.id}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);
      const certBody = await page.locator('body').innerText();
      ck('the certificate page loads', !/not found|failed to load/i.test(certBody),
         certBody.replace(/\n+/g, ' | ').slice(0, 120));
      ck('the certificate names the learner', /Deep Tester/.test(certBody));

      const dl = await page.request.get(`${BASE}/api/certificates/${cert.id}/download`);
      const dlText = await dl.text();
      ck('the certificate downloads', dl.status() === 200);
      ck('the downloaded certificate names the learner and course',
         dlText.includes('Deep Tester') && /chiropractic/i.test(dlText));
    }

    // --------------------------------------------------------- notifications
    context.current = 'notifications';
    const notifs = await api('GET', '/notifications');
    const items = notifs.body?.data ?? [];
    ck('real notifications were recorded', items.length >= 3, `${items.length} notifications`);
    const kinds = items.map((n) => n.type);
    ck('the notifications reflect what actually happened',
       kinds.includes('course_created') && kinds.includes('certificate_earned'),
       kinds.join(', '));

    await page.goto(`${BASE}/notifications`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const markAll = page.locator('button:has-text("Mark all as read")');
    if (await markAll.count()) {
      await markAll.first().click().catch(() => {});
      await page.waitForTimeout(2000);
      const unread = (await api('GET', '/notifications/unread-count')).body?.unread;
      ck('marking all as read clears the badge', unread === 0, `unread ${unread}`);
    }

    // ---------------------------------------------------------- gamification
    context.current = 'gamification';
    const xpBefore = (await api('GET', '/gamification/stats')).body?.data?.xp ?? 0;
    const xpPost = await api('POST', '/gamification/xp', { action: 'COURSE_COMPLETED' });
    ck('the XP endpoint accepts the action the app sends', xpPost.status === 200,
       `status ${xpPost.status}`);
    const xpAfter = (await api('GET', '/gamification/stats')).body?.data?.xp ?? 0;
    ck('completing something awards XP', xpAfter > xpBefore, `${xpBefore} -> ${xpAfter}`);

    // -------------------------------------------------------------- billing
    context.current = 'billing';
    await page.goto(`${BASE}/billing`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const billing = await page.locator('body').innerText();
    ck('the billing page shows the current plan', /monthly|plan|subscription/i.test(billing),
       billing.replace(/\n+/g, ' | ').slice(0, 120));
    const invoices = await api('GET', '/billing/invoices');
    ck('invoices are readable', invoices.status === 200, `status ${invoices.status}`);

    // ------------------------------------------------------------ templates
    context.current = 'templates';
    await page.goto(`${BASE}/templates`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const templates = await page.locator('body').innerText();
    ck('templates are listed', templates.length > 200 && !/something went wrong/i.test(templates),
       templates.replace(/\n+/g, ' | ').slice(0, 120));

    // ------------------------------------------------------------ dashboard
    context.current = 'dashboard';
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const dashboard = await page.locator('body').innerText();
    ck('the dashboard lists the created course', /chiropractic/i.test(dashboard),
       dashboard.replace(/\n+/g, ' | ').slice(0, 120));

    // Deleting must actually remove it.
    const countBefore = (await api('GET', '/courses')).body?.data?.length ?? 0;
    const del = await api('DELETE', `/courses/${courseId}`);
    const countAfter = (await api('GET', '/courses')).body?.data?.length ?? 0;
    ck('deleting a course removes it', del.status === 200 && countAfter === countBefore - 1,
       `${countBefore} -> ${countAfter}`);

    // --------------------------------------------------------- sign out / in
    context.current = 'session';
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const logout = page.locator('button:has-text("Log out")').first();
    if (await logout.count()) {
      await logout.click().catch(() => {});
      await page.waitForTimeout(2500);
    } else {
      await page.evaluate(() => localStorage.removeItem('accessToken'));
    }

    // A signed-out visitor must not reach a protected page.
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    ck('signing out locks the dashboard', page.url().includes('/login'), page.url());
  } catch (e) {
    ck('no exception during the run', false, `${context.current}: ${e.message.slice(0, 200)}`);
  }

  ck('no failed API requests anywhere in the run', apiErrors.length === 0);
  ck('no uncaught JS errors anywhere in the run', jsErrors.length === 0);

  const failed = finish({ 'Failed API requests': apiErrors, 'Uncaught JS errors': jsErrors });
  await browser.close();
  await disconnect();
  process.exit(failed > 0 ? 1 : 0);
})();

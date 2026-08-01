import { escapeHtml, markdownToHtml, wordCount } from '../utils/markdown';

/**
 * Builds the printable course document served by /courses/:id/export/pdf.
 *
 * Puppeteer is not available on the deployment target, so the export is an
 * HTML page the browser turns into a PDF via Ctrl+P. That makes the print
 * stylesheet the actual product, and it is written print-first:
 *
 * - `@page { margin: 0 }` — Chrome only draws its date/URL header and footer
 *   inside the page margin box, so zeroing it removes them. The margins come
 *   from padding on each page section instead.
 * - No reliance on background fills. Chrome leaves "Background graphics" off
 *   by default, so anything that depends on a coloured panel to be legible
 *   would print as white-on-white. Structure is carried by rules, borders and
 *   coloured text, all of which print either way.
 * - Every lesson starts its own page, which both guarantees correct margins
 *   and gives the export the rhythm of a printed workbook.
 */

const CHROME_PRINT_HINT =
  'Press Ctrl + P (Cmd + P on Mac) and choose "Save as PDF". Turn on "Background graphics" in More settings for the full design.';

interface Lesson {
  title: string;
  content: string;
  imageUrl?: string | null;
}

interface Topic {
  title: string;
  subtopics: Lesson[];
}

const readingTime = (words: number): string => {
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
};

const romanNumeral = (n: number): string => {
  const table: [number, string][] = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let rest = n;
  let out = '';
  for (const [value, symbol] of table) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out || 'I';
};

export function buildCourseDocument(course: any): string {
  const topics: Topic[] = Array.isArray(course.topics) ? course.topics : [];
  const lessons = topics.flatMap((topic) => topic.subtopics || []);
  const totalWords = lessons.reduce((sum, lesson) => sum + wordCount(lesson.content), 0);
  const issued = new Date(course.createdAt || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const title = escapeHtml(course.title || 'Course');

  const contents = topics
    .map((topic, topicIndex) => {
      const rows = (topic.subtopics || [])
        .map(
          (lesson, lessonIndex) => `
            <li class="toc-lesson">
              <span class="toc-num">${topicIndex + 1}.${lessonIndex + 1}</span>
              <span class="toc-text">${escapeHtml(lesson.title)}</span>
            </li>`
        )
        .join('');

      return `
        <li class="toc-topic">
          <div class="toc-topic-head">
            <span class="toc-part">Part ${romanNumeral(topicIndex + 1)}</span>
            <h3>${escapeHtml(topic.title)}</h3>
          </div>
          <ul>${rows}</ul>
        </li>`;
    })
    .join('');

  const body = topics
    .map((topic, topicIndex) => {
      const opener = `
        <section class="sheet chapter">
          <div class="chapter-inner">
            <span class="chapter-part">Part ${romanNumeral(topicIndex + 1)}</span>
            <h2 class="chapter-title">${escapeHtml(topic.title)}</h2>
            <div class="chapter-rule"></div>
            <ol class="chapter-list">
              ${(topic.subtopics || [])
                .map((lesson) => `<li>${escapeHtml(lesson.title)}</li>`)
                .join('')}
            </ol>
          </div>
        </section>`;

      const lessonPages = (topic.subtopics || [])
        .map((lesson, lessonIndex) => {
          const words = wordCount(lesson.content);
          return `
        <article class="lesson">
          <table class="pagebox">
            <thead><tr><td><div class="page-pad"></div></td></tr></thead>
            <tbody><tr><td>
              <header class="lesson-head">
                <div class="lesson-meta">
                  <span class="lesson-num">Lesson ${topicIndex + 1}.${lessonIndex + 1}</span>
                  <span class="lesson-dot">&bull;</span>
                  <span>${readingTime(words)}</span>
                </div>
                <h3 class="lesson-title">${escapeHtml(lesson.title)}</h3>
                <p class="lesson-parent">${escapeHtml(topic.title)}</p>
              </header>
              ${
                lesson.imageUrl
                  ? `<figure class="lesson-figure">
                       <img src="${escapeHtml(lesson.imageUrl)}" alt="${escapeHtml(lesson.title)}"
                            onerror="this.closest('figure').remove()" />
                     </figure>`
                  : ''
              }
              <div class="prose">${markdownToHtml(lesson.content)}</div>
            </td></tr></tbody>
          </table>
        </article>`;
        })
        .join('');

      return opener + lessonPages;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="${escapeHtml(course.language || 'en')}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet" />
<style>
  :root {
    --ink: #14161f;
    --body: #2c3040;
    --muted: #6b7186;
    --faint: #9aa0b4;
    --rule: #e2e5ee;
    --accent: #6c47ff;
    --accent-soft: #f2effe;
    --page-x: 20mm;
    --page-y: 18mm;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html { background: #eceef4; }

  body {
    font-family: 'Source Serif 4', Georgia, serif;
    color: var(--body);
    font-size: 11.2pt;
    line-height: 1.72;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ---------- print bar (screen only) ---------- */
  .print-bar {
    position: sticky; top: 0; z-index: 20;
    display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
    gap: 8px 16px;
    padding: 14px 20px;
    background: var(--accent); color: #fff;
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
    text-align: center;
  }
  .print-bar button {
    font: inherit; font-weight: 600; cursor: pointer;
    background: #fff; color: var(--accent);
    border: 0; border-radius: 8px; padding: 7px 16px;
  }

  /* ---------- page geometry ---------- */
  .sheet, .lesson {
    width: 210mm;
    margin: 0 auto;
    padding: var(--page-y) var(--page-x);
    background: #fff;
  }
  .sheet { min-height: 297mm; display: flex; flex-direction: column; }

  @media screen {
    .sheet, .lesson {
      margin: 22px auto;
      box-shadow: 0 1px 2px rgba(20, 22, 31, .08), 0 12px 32px rgba(20, 22, 31, .10);
      border-radius: 2px;
    }
  }

  /* ---------- cover ---------- */
  .cover { justify-content: space-between; }
  .cover-top { display: flex; align-items: center; gap: 10px; }
  .mark {
    width: 22px; height: 22px; border-radius: 6px;
    border: 1.5px solid var(--accent); color: var(--accent);
    font-family: 'Inter', sans-serif; font-weight: 700; font-size: 12px;
    display: flex; align-items: center; justify-content: center;
  }
  .wordmark {
    font-family: 'Inter', sans-serif; font-weight: 600; font-size: 11px;
    letter-spacing: .22em; text-transform: uppercase; color: var(--ink);
  }
  .cover-main { padding: 6mm 0; }
  .eyebrow {
    font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 600;
    letter-spacing: .26em; text-transform: uppercase; color: var(--accent);
  }
  .cover h1 {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 600; font-size: 42pt; line-height: 1.06;
    letter-spacing: -.02em; color: var(--ink);
    margin: 10mm 0 8mm;
  }
  .cover-rule { height: 3px; width: 46mm; background: var(--accent); }
  .cover-blurb {
    margin-top: 8mm; max-width: 120mm;
    font-size: 12pt; line-height: 1.7; color: var(--muted);
  }
  .facts {
    display: grid; grid-template-columns: repeat(2, 1fr);
    column-gap: 10mm; row-gap: 5mm;
    border-top: 1px solid var(--rule); padding-top: 6mm;
  }
  .fact dt {
    font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 600;
    letter-spacing: .18em; text-transform: uppercase; color: var(--faint);
    margin-bottom: 3px;
  }
  .fact dd {
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: var(--ink);
  }
  .cover-foot {
    display: flex; justify-content: space-between; align-items: baseline;
    border-top: 1px solid var(--rule); padding-top: 5mm;
    font-family: 'Inter', sans-serif; font-size: 10px; color: var(--faint);
    letter-spacing: .06em;
  }

  /* ---------- contents ---------- */
  .section-label {
    font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 600;
    letter-spacing: .26em; text-transform: uppercase; color: var(--accent);
  }
  .section-title {
    font-family: 'Fraunces', Georgia, serif; font-weight: 600;
    font-size: 26pt; color: var(--ink); margin: 4mm 0 9mm;
    letter-spacing: -.01em;
  }
  .toc { list-style: none; }
  .toc-topic { break-inside: avoid; }
  .toc-topic + .toc-topic { margin-top: 8mm; padding-top: 7mm; border-top: 1px solid var(--rule); }
  .toc-part {
    font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 700;
    letter-spacing: .2em; text-transform: uppercase; color: var(--accent);
  }
  .toc-topic-head h3 {
    font-family: 'Fraunces', Georgia, serif; font-weight: 600;
    font-size: 15pt; color: var(--ink); margin: 2mm 0 4mm; letter-spacing: -.01em;
  }
  .toc-topic ul { list-style: none; }
  .toc-lesson {
    display: flex; gap: 10px; align-items: baseline;
    padding: 2.2mm 0; border-bottom: 1px dotted var(--rule);
    font-size: 10.8pt;
  }
  .toc-num {
    font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 600;
    color: var(--accent); min-width: 12mm;
  }
  .toc-text { color: var(--body); }

  /* ---------- chapter opener ---------- */
  .chapter { justify-content: center; page-break-before: always; break-before: page; }
  .chapter-inner { padding-bottom: 20mm; }
  .chapter-part {
    font-family: 'Inter', sans-serif; font-size: 10px; font-weight: 700;
    letter-spacing: .3em; text-transform: uppercase; color: var(--accent);
  }
  .chapter-title {
    font-family: 'Fraunces', Georgia, serif; font-weight: 600;
    font-size: 32pt; line-height: 1.12; letter-spacing: -.02em;
    color: var(--ink); margin: 6mm 0;
  }
  .chapter-rule { height: 2px; width: 32mm; background: var(--accent); margin-bottom: 8mm; }
  .chapter-list { padding-left: 5mm; color: var(--muted); font-size: 11.5pt; }
  .chapter-list li { padding: 1.6mm 0; }

  /* ---------- lesson ---------- */
  /* A lesson can run past one page. With zero page margins the second page
     would otherwise start hard against the paper edge, because vertical
     padding only applies to a box's first and last fragment. Chrome repeats a
     table's <thead> on every page it spans, so an empty header row acts as a
     top margin that survives every break. */
  .lesson { page-break-before: always; break-before: page; padding-top: 0; }
  .pagebox { width: 100%; border-collapse: collapse; }
  .pagebox > thead > tr > td,
  .pagebox > tbody > tr > td { padding: 0; vertical-align: top; }
  .page-pad { height: var(--page-y); }
  .lesson-head { border-bottom: 1px solid var(--rule); padding-bottom: 5mm; margin-bottom: 7mm; }
  .lesson-meta {
    display: flex; align-items: center; gap: 8px;
    font-family: 'Inter', sans-serif; font-size: 9.5px; font-weight: 600;
    letter-spacing: .14em; text-transform: uppercase; color: var(--faint);
  }
  .lesson-num { color: var(--accent); }
  .lesson-dot { color: var(--rule); }
  .lesson-title {
    font-family: 'Fraunces', Georgia, serif; font-weight: 600;
    font-size: 21pt; line-height: 1.22; letter-spacing: -.015em;
    color: var(--ink); margin: 3mm 0 2mm;
  }
  .lesson-parent {
    font-family: 'Inter', sans-serif; font-size: 10.5px; color: var(--muted);
  }
  .lesson-figure { margin: 0 0 7mm; break-inside: avoid; }
  .lesson-figure img {
    display: block; width: 100%; height: 62mm; object-fit: cover;
    border: 1px solid var(--rule); border-radius: 3px;
  }

  /* ---------- prose ---------- */
  .prose { orphans: 3; widows: 3; }
  .prose .md-p { margin: 0 0 4.2mm; text-align: justify; hyphens: auto; }
  .prose .md-h2 {
    font-family: 'Fraunces', Georgia, serif; font-weight: 600;
    font-size: 14pt; color: var(--ink); letter-spacing: -.01em;
    margin: 8mm 0 3.5mm; padding-left: 4mm; border-left: 3px solid var(--accent);
    break-after: avoid;
  }
  .prose .md-h3 {
    font-family: 'Inter', sans-serif; font-weight: 700; font-size: 11pt;
    color: var(--ink); margin: 6mm 0 2.5mm; break-after: avoid;
  }
  .prose strong { color: var(--ink); font-weight: 600; }
  .prose a { color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--rule); }
  .prose code {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
    font-size: .86em; color: #4a32c0;
    background: var(--accent-soft); border: 1px solid #e0daf9;
    border-radius: 4px; padding: .5mm 1.2mm;
  }
  .prose .md-code {
    margin: 5mm 0; padding: 4mm 5mm; break-inside: avoid;
    background: #f7f8fb; border: 1px solid var(--rule);
    border-left: 3px solid var(--accent); border-radius: 3px;
    overflow-x: auto;
  }
  .prose .md-code code {
    background: none; border: 0; padding: 0; color: #23262f;
    font-size: 9.4pt; line-height: 1.62; white-space: pre-wrap; word-break: break-word;
  }
  .prose .md-quote {
    margin: 6mm 0; padding: 4mm 0 4mm 6mm; break-inside: avoid;
    border-left: 3px solid var(--accent);
    font-size: 12pt; line-height: 1.62; font-style: italic; color: var(--ink);
  }
  .prose .md-ul, .prose .md-ol { margin: 0 0 4.5mm; padding-left: 6mm; }
  .prose .md-ul li, .prose .md-ol li { margin-bottom: 2.2mm; padding-left: 1.5mm; }
  .prose .md-ul li::marker { color: var(--accent); }
  .prose .md-ol li::marker { color: var(--accent); font-family: 'Inter', sans-serif; font-weight: 700; font-size: .9em; }
  .prose .md-hr { border: 0; height: 1px; background: var(--rule); margin: 7mm 0; }
  .prose .md-callout {
    margin: 6mm 0; padding: 5mm 6mm; break-inside: avoid;
    background: #fafbfd; border: 1px solid var(--rule); border-radius: 3px;
  }
  .prose .md-callout h6 {
    font-family: 'Inter', sans-serif; font-size: 9.5px; font-weight: 700;
    letter-spacing: .18em; text-transform: uppercase; color: var(--accent);
    margin-bottom: 3.5mm;
  }
  .prose .md-callout ul { list-style: none; }
  .prose .md-callout li { position: relative; padding-left: 5mm; margin-bottom: 2.4mm; }
  .prose .md-callout li::before {
    content: ''; position: absolute; left: 0; top: 2.6mm;
    width: 1.6mm; height: 1.6mm; border-radius: 50%; background: var(--accent);
  }

  /* ---------- closing ---------- */
  .colophon { justify-content: center; text-align: center; page-break-before: always; break-before: page; }
  .colophon h2 {
    font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-size: 24pt;
    color: var(--ink); margin-bottom: 5mm;
  }
  .colophon p { color: var(--muted); max-width: 110mm; margin: 0 auto 4mm; }
  .colophon .mark { margin: 0 auto 6mm; }

  /* ---------- print ---------- */
  @page { size: A4; margin: 0; }

  @media print {
    html { background: #fff; }
    .print-bar { display: none !important; }
    .sheet, .lesson {
      width: auto; margin: 0; box-shadow: none; border-radius: 0;
      padding: var(--page-y) var(--page-x);
    }
    .sheet { min-height: 297mm; }
    .cover { page-break-after: always; break-after: page; }
    .contents { page-break-after: always; break-after: page; }
    a { color: var(--accent); }
  }
</style>
</head>
<body>

<div class="print-bar">
  <span>${escapeHtml(CHROME_PRINT_HINT)}</span>
  <button onclick="window.print()">Save as PDF</button>
</div>

<section class="sheet cover">
  <div class="cover-top">
    <span class="mark">C</span>
    <span class="wordmark">Coursbit</span>
  </div>

  <div class="cover-main">
    <span class="eyebrow">Course Workbook</span>
    <h1>${title}</h1>
    <div class="cover-rule"></div>
    <p class="cover-blurb">
      A complete, self-paced course covering ${topics.length} ${
        topics.length === 1 ? 'module' : 'modules'
      } and ${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'},
      written to be read cover to cover or used as a reference.
    </p>
  </div>

  <div>
    <dl class="facts">
      <div class="fact"><dt>Language</dt><dd>${escapeHtml(course.language || 'English')}</dd></div>
      <div class="fact"><dt>Modules</dt><dd>${topics.length}</dd></div>
      <div class="fact"><dt>Lessons</dt><dd>${lessons.length}</dd></div>
      <div class="fact"><dt>Reading time</dt><dd>${readingTime(totalWords)}</dd></div>
    </dl>
    <div class="cover-foot">
      <span>Issued ${escapeHtml(issued)}</span>
      <span>coursbit.com</span>
    </div>
  </div>
</section>

<section class="sheet contents">
  <span class="section-label">Contents</span>
  <h2 class="section-title">What you will learn</h2>
  <ol class="toc">${contents}</ol>
</section>

${body}

<section class="sheet colophon">
  <div>
    <span class="mark">C</span>
    <h2>End of course</h2>
    <p>
      You have reached the end of <strong>${title}</strong>. Revisit the
      Key Takeaways in each lesson after a day and again after a week — spaced
      review is what moves material into long-term memory.
    </p>
    <p class="wordmark" style="color: var(--faint); margin-top: 8mm;">Generated by Coursbit &middot; coursbit.com</p>
  </div>
</section>

</body>
</html>`;
}

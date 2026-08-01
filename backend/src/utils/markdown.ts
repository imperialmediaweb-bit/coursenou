/**
 * Minimal Markdown -> HTML renderer for exported documents.
 *
 * The PDF export used to emit lesson text as raw lines wrapped in <p> tags, so
 * learners saw literal `**bold**`, `##` and `- ` markers in the file they
 * downloaded. This mirrors the block structure the web reader already renders
 * (frontend/src/components/course/LessonContent.tsx) so the export matches the
 * app instead of contradicting it.
 *
 * Everything is escaped before any markup is added — lesson bodies come from a
 * language model and must never be treated as trusted HTML.
 */

export function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** ***bold italic***, **bold**, *italic*, `code`, [text](url) */
function renderInline(text: string): string {
  let out = escapeHtml(text);

  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2">$1</a>'
  );

  return out;
}

const stripMarks = (s: string) => s.replace(/\*/g, '').replace(/^#+\s*/, '').trim();

const isLabelLine = (s: string) =>
  /^\*\*[^*]+\*\*:?$/.test(s) && stripMarks(s).length <= 60;

/**
 * Gathers consecutive list items, tolerating a single blank line and wrapped
 * continuation lines between them — otherwise every item becomes its own list
 * and ordered numbering restarts at 1 each time.
 */
function collectItems(
  lines: string[],
  start: number,
  marker: RegExp
): { items: string[]; next: number } {
  const items: string[] = [];
  let i = start;
  let blanks = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      blanks++;
      if (blanks > 1) break;
      i++;
      continue;
    }

    if (marker.test(trimmed)) {
      items.push(trimmed.replace(marker, ''));
      blanks = 0;
      i++;
      continue;
    }

    if (items.length && blanks === 0 && /^\s{2,}/.test(lines[i])) {
      items[items.length - 1] += ' ' + trimmed;
      i++;
      continue;
    }

    break;
  }

  return { items, next: i };
}

export function markdownToHtml(markdown: string): string {
  const lines = String(markdown ?? '').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // Fenced code block
    if (line.startsWith('```')) {
      const buffer: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) buffer.push(lines[i++]);
      i++;
      out.push(`<pre class="md-code"><code>${escapeHtml(buffer.join('\n'))}</code></pre>`);
      continue;
    }

    // Horizontal rule
    if (/^([-*_])\1{2,}$/.test(line)) {
      out.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('#### ') || line.startsWith('### ')) {
      out.push(`<h5 class="md-h3">${renderInline(stripMarks(line))}</h5>`);
      i++;
      continue;
    }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      out.push(`<h4 class="md-h2">${renderInline(stripMarks(line))}</h4>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const buffer: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        buffer.push(lines[i].trim().slice(2));
        i++;
      }
      out.push(`<blockquote class="md-quote">${renderInline(buffer.join(' '))}</blockquote>`);
      continue;
    }

    // A short bold label followed by a list becomes a highlighted card
    if (isLabelLine(line)) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = lines[j]?.trim() ?? '';

      if (/^[-*•]\s+/.test(next) || /^\d+[.)]\s+/.test(next)) {
        const { items, next: resume } = collectItems(lines, j, /^(?:[-*•]|\d+[.)])\s+/);
        const title = stripMarks(line).replace(/:$/, '');
        out.push(
          `<section class="md-callout"><h6>${renderInline(title)}</h6><ul>` +
            items.map((item) => `<li>${renderInline(item)}</li>`).join('') +
            '</ul></section>'
        );
        i = resume;
        continue;
      }

      out.push(`<h5 class="md-h3">${renderInline(stripMarks(line).replace(/:$/, ''))}</h5>`);
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*•]\s+/.test(line)) {
      const { items, next } = collectItems(lines, i, /^[-*•]\s+/);
      out.push(
        `<ul class="md-ul">${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`
      );
      i = next;
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(line)) {
      const { items, next } = collectItems(lines, i, /^\d+[.)]\s*/);
      out.push(
        `<ol class="md-ol">${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ol>`
      );
      i = next;
      continue;
    }

    out.push(`<p class="md-p">${renderInline(line)}</p>`);
    i++;
  }

  return out.join('\n');
}

/**
 * Flattens Markdown to readable plain text for targets that cannot render it
 * (PowerPoint slides), so `**bold**` and `##` never reach the learner.
 */
export function markdownToPlainText(markdown: string): string {
  return String(markdown ?? '')
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim()
    )
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '• ')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Rough word count of a lesson body, used for the export's reading estimate. */
export function wordCount(text: string): number {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
}

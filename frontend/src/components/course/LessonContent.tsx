import { ReactNode } from 'react';

/**
 * Renders AI-generated lesson text as styled content.
 *
 * The model emits loose markdown, so we parse it line-by-line into visual
 * blocks (headings, callouts, lists, quotes, code, tables) rather than
 * dumping raw text with literal ** and *** markers on screen.
 */

/** Inline markers: ***bold italic***, **bold**, *italic*, `code`, [text](url) */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern =
    /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|(?<!\*)\*(?!\*)[^*]+\*(?!\*)|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyPrefix}-i${i++}`;

    if (tok.startsWith('***')) {
      out.push(<strong key={k} className="text-white font-semibold italic">{tok.slice(3, -3)}</strong>);
    } else if (tok.startsWith('**')) {
      out.push(<strong key={k} className="text-white font-semibold">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('`')) {
      out.push(
        <code key={k} className="px-1.5 py-0.5 mx-0.5 rounded-md bg-accent/10 text-accent-glow font-mono text-[0.86em] border border-accent/20">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith('[')) {
      const mm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
      out.push(
        <a key={k} href={mm?.[2]} target="_blank" rel="noreferrer"
           className="text-accent-glow underline underline-offset-2 hover:text-accent transition-colors">
          {mm?.[1]}
        </a>
      );
    } else {
      out.push(<em key={k} className="italic text-white/90">{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const stripMarks = (s: string) => s.replace(/\*/g, '').replace(/^#+\s*/, '').trim();

/** A short bold line acting as a section label, e.g. "**Key Points**" */
const isLabelLine = (s: string) =>
  /^\*\*[^*]+\*\*:?$/.test(s) && stripMarks(s).length <= 60;

type Block =
  | { kind: 'h2' | 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'callout'; title: string; items: string[] }
  | { kind: 'hr' };

/**
 * Gathers consecutive list items, tolerating blank lines and wrapped
 * continuation lines between them, and returns the index to resume from.
 */
function collectItems(
  lines: string[],
  start: number,
  marker: RegExp,
  strip: (t: string) => string
): { items: string[]; next: number } {
  const items: string[] = [];
  let i = start;
  let blanks = 0;

  while (i < lines.length) {
    const t = lines[i].trim();

    if (!t) {
      blanks++;
      if (blanks > 1) break;   // a real paragraph break ends the list
      i++;
      continue;
    }

    if (marker.test(t)) {
      items.push(strip(t));
      blanks = 0;
      i++;
      continue;
    }

    // Wrapped continuation of the previous item (indented, no new marker)
    if (items.length && blanks === 0 && /^\s{2,}/.test(lines[i])) {
      items[items.length - 1] += ' ' + t;
      i++;
      continue;
    }

    break;
  }

  return { items, next: i };
}

function parse(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) { i++; continue; }

    // fenced code
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) buf.push(lines[i++]);
      i++;
      blocks.push({ kind: 'code', text: buf.join('\n') });
      continue;
    }

    // horizontal rule
    if (/^([-*_])\1{2,}$/.test(line)) { blocks.push({ kind: 'hr' }); i++; continue; }

    // headings
    if (line.startsWith('### ')) { blocks.push({ kind: 'h3', text: stripMarks(line) }); i++; continue; }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      blocks.push({ kind: 'h2', text: stripMarks(line) }); i++; continue;
    }

    // blockquote
    if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        buf.push(lines[i].trim().slice(2)); i++;
      }
      blocks.push({ kind: 'quote', text: buf.join(' ') });
      continue;
    }

    // bold label followed by a list -> callout card
    if (isLabelLine(line)) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const next = lines[j]?.trim() ?? '';
      if (/^[-*•]\s+/.test(next) || /^\d+[.)]\s+/.test(next)) {
        const { items, next: resume } = collectItems(
          lines, j,
          /^(?:[-*•]|\d+[.)])\s+/,
          (t) => t.replace(/^(?:[-*•]|\d+[.)])\s*/, '')
        );
        blocks.push({ kind: 'callout', title: stripMarks(line).replace(/:$/, ''), items });
        i = resume;
        continue;
      }
      blocks.push({ kind: 'h3', text: stripMarks(line).replace(/:$/, '') });
      i++;
      continue;
    }

    // unordered list — blank lines between items must not split the list,
    // otherwise each item renders as its own single-item list.
    if (/^[-*•]\s+/.test(line)) {
      const { items, next } = collectItems(lines, i, /^[-*•]\s+/, (t) => t.replace(/^[-*•]\s+/, ''));
      blocks.push({ kind: 'ul', items });
      i = next;
      continue;
    }

    // ordered list — same blank-line handling, so numbering stays 1,2,3…
    if (/^\d+[.)]\s+/.test(line)) {
      const { items, next } = collectItems(lines, i, /^\d+[.)]\s+/, (t) => t.replace(/^\d+[.)]\s*/, ''));
      blocks.push({ kind: 'ol', items });
      i = next;
      continue;
    }

    blocks.push({ kind: 'p', text: line });
    i++;
  }

  return blocks;
}

export default function LessonContent({ content }: { content: string }) {
  const blocks = parse(content || '');

  return (
    <article className="max-w-none">
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.kind) {
          case 'h2':
            return (
              <h3 key={k} className="flex items-center gap-3 text-[21px] font-semibold text-white mt-10 mb-4 first:mt-0">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-accent to-accent-glow flex-shrink-0" />
                {renderInline(b.text, k)}
              </h3>
            );

          case 'h3':
            return (
              <h4 key={k} className="text-[16px] font-semibold text-white/95 mt-7 mb-3 first:mt-0">
                {renderInline(b.text, k)}
              </h4>
            );

          case 'p':
            return (
              <p key={k} className="text-[15.5px] leading-[1.85] text-prose mb-4">
                {renderInline(b.text, k)}
              </p>
            );

          case 'quote':
            return (
              <blockquote key={k} className="my-6 pl-5 border-l-2 border-accent/50 bg-accent/[0.04] rounded-r-xl py-3.5 pr-4">
                <p className="text-[15.5px] leading-[1.8] text-prose/95 italic">{renderInline(b.text, k)}</p>
              </blockquote>
            );

          case 'code':
            return (
              <pre key={k} className="my-6 rounded-xl bg-[#0B0D14] border border-border p-4 overflow-x-auto">
                <code className="text-[13px] leading-relaxed text-prose font-mono whitespace-pre">{b.text}</code>
              </pre>
            );

          case 'hr':
            return <hr key={k} className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />;

          case 'ul':
            return (
              <ul key={k} className="my-4 space-y-2.5">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    <span className="text-[15.5px] leading-[1.8] text-prose">{renderInline(it, `${k}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={k} className="my-5 space-y-3">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3.5">
                    <span className="mt-0.5 w-6 h-6 rounded-lg bg-accent/12 border border-accent/25 text-accent text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {j + 1}
                    </span>
                    <span className="text-[15.5px] leading-[1.8] text-prose">{renderInline(it, `${k}-${j}`)}</span>
                  </li>
                ))}
              </ol>
            );

          case 'callout':
            return (
              <section
                key={k}
                className="my-6 rounded-2xl border border-border bg-surface/60 p-5 sm:p-6"
              >
                <h4 className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-accent mb-4">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 1.5l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-2.9-5.4 2.9 1.2-6L1.3 7.9l6.1-.8z" />
                  </svg>
                  {b.title}
                </h4>
                <ul className="space-y-3">
                  {b.items.map((it, j) => (
                    <li key={j} className="flex gap-3">
                      <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-accent/70 flex-shrink-0" />
                      <span className="text-[15px] leading-[1.75] text-prose">{renderInline(it, `${k}-${j}`)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );

          default:
            return null;
        }
      })}
    </article>
  );
}

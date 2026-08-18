import fs from 'fs';
import path from 'path';
import { metaForPath } from './pageMeta';
import { getSiteSettings } from './siteSettings';

/**
 * Serves the app's HTML with the current page's own metadata already in it.
 *
 * The alternative — setting the title from React once the bundle has booted —
 * works for a human and not for anything else. A crawler, a link preview, a
 * chat unfurl and a social card all read the first response and never run the
 * JavaScript, so they would all see the same generic title on every URL.
 * Rewriting the head here costs one string replacement per request and makes
 * the first response true.
 *
 * This is also where the operator's analytics snippet goes, for the same
 * reason it belongs in <head>: it should run before the app does, so a visitor
 * who leaves during the load is still counted.
 */

let template: string | null = null;
let templatePath = '';

export function loadShell(distDir: string): void {
  templatePath = path.join(distDir, 'index.html');
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch {
    // In development the built bundle does not exist; Vite serves the app.
    template = null;
  }
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** JSON inside a <script> tag has to survive a literal `</script>` in the data. */
const escapeJsonLd = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c');

/**
 * The origin to build absolute links from.
 *
 * A canonical link or an og:url has to be absolute — a relative one is ignored
 * by every crawler and every link unfurler, which would make the whole exercise
 * pointless on a fresh install where nobody has filled in the field yet. The
 * configured value wins when there is one; otherwise the host the request
 * arrived on is correct by construction.
 */
export function originFor(site: { siteUrl: string }, requestOrigin?: string): string {
  return site.siteUrl || (requestOrigin || '').replace(/\/+$/, '');
}

export async function renderShell(pathname: string, requestOrigin?: string): Promise<string> {
  if (template === null) {
    // Read once more in case the build finished after startup.
    try {
      template = fs.readFileSync(templatePath, 'utf8');
    } catch {
      return '<!doctype html><title>Not built</title><p>Run npm run build.</p>';
    }
  }

  const [site, meta] = await Promise.all([getSiteSettings(), metaForPath(pathname)]);
  const origin = originFor(site, requestOrigin);
  const canonical = origin ? origin + meta.canonical : meta.canonical;
  const image = meta.image
    ? meta.image.startsWith('http')
      ? meta.image
      : origin + meta.image
    : origin
      ? `${origin}/og-default.png`
      : '';

  const tags = [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    meta.noindex || !site.indexable
      ? '<meta name="robots" content="noindex, nofollow" />'
      : '<meta name="robots" content="index, follow, max-image-preview:large" />',
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(site.siteName)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : '',
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : '',
    meta.structuredData
      ? `<script type="application/ld+json">${escapeJsonLd(meta.structuredData)}</script>`
      : '',
    site.analyticsSnippet.trim(),
  ]
    .filter(Boolean)
    .join('\n    ');

  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/\s*<meta\s+name="description"[^>]*>/i, '')
    .replace('</head>', `  ${tags}\n  </head>`);
}

/**
 * robots.txt.
 *
 * Without one, a crawler is free to spend its time on /dashboard and /admin,
 * both of which redirect to a sign-in page — so the pages that should be
 * indexed get less attention than the pages that cannot be.
 */
export async function renderRobots(requestOrigin?: string): Promise<string> {
  const site = await getSiteSettings();

  if (!site.indexable) {
    return 'User-agent: *\nDisallow: /\n';
  }

  const lines = [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /dashboard',
    'Disallow: /settings',
    'Disallow: /billing',
    'Disallow: /notifications',
    'Disallow: /bookmarks',
    'Disallow: /templates',
    'Disallow: /create',
    'Disallow: /course/',
    'Disallow: /certificate/',
    'Disallow: /share/',
    'Disallow: /card/',
    'Disallow: /reset-password/',
    'Disallow: /api/',
    '',
  ];

  const origin = originFor(site, requestOrigin);
  if (origin) lines.push(`Sitemap: ${origin}/sitemap.xml`, '');

  return lines.join('\n');
}

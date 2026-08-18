import prisma from '../utils/prisma';

/**
 * The public-facing settings an operator changes without touching code: what
 * the site is called, what search engines are told it is, and which analytics
 * script runs on it.
 *
 * Kept separate from the sealed credentials in `secretsService` on purpose.
 * Nothing here is a secret — it is all served to every visitor in the page
 * source — so it is stored in plain text and readable without authentication.
 */

const PREFIX = 'site.';

export interface SiteSettings {
  /** Used in titles, the sitemap and structured data. */
  siteName: string;
  /** The one-line description search engines show under the title. */
  description: string;
  /**
   * The canonical origin, e.g. https://coursbit.com. Needed for absolute URLs
   * in the sitemap and in link previews, which cannot be relative.
   */
  siteUrl: string;
  /**
   * Whatever the analytics vendor tells you to paste into <head>. Plausible,
   * Google Analytics, PostHog, Fathom, Umami — all of them are a script tag,
   * so the platform stays out of the choice rather than marrying one vendor.
   */
  analyticsSnippet: string;
  /**
   * Whether search engines may index the site at all. Off is the right setting
   * for a staging copy; leaving it off in production is the classic way to
   * launch a site nobody can find.
   */
  indexable: boolean;
}

const DEFAULTS: SiteSettings = {
  siteName: 'Coursbit',
  description:
    'Type a subject and get a complete course in minutes: written lessons, illustrations, quizzes, certificates, and PDF or PowerPoint export, in 23 languages.',
  siteUrl: '',
  analyticsSnippet: '',
  indexable: true,
};

let cache: SiteSettings | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

/** The origin to use when nothing has been configured, so links still work. */
function fallbackUrl(): string {
  return (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
}

export async function getSiteSettings(force = false): Promise<SiteSettings> {
  if (!force && cache && Date.now() - cachedAt < TTL_MS) return cache;

  const settings: SiteSettings = { ...DEFAULTS, siteUrl: fallbackUrl() };

  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { startsWith: PREFIX } },
    });

    for (const row of rows) {
      const field = row.key.slice(PREFIX.length) as keyof SiteSettings;
      if (field === 'indexable') {
        settings.indexable = row.value !== 'false';
      } else if (field in settings) {
        (settings as unknown as Record<string, string>)[field] = row.value;
      }
    }
  } catch (error: any) {
    // A settings table that cannot be read must not take the site down; the
    // defaults above are a working site.
    console.error('Could not read site settings:', error.message || error);
  }

  if (!settings.siteUrl) settings.siteUrl = fallbackUrl();
  settings.siteUrl = settings.siteUrl.replace(/\/+$/, '');

  cache = settings;
  cachedAt = Date.now();
  hostCache = analyticsHosts(settings.analyticsSnippet);
  return settings;
}

export async function setSiteSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const entries = Object.entries(patch).filter(([key]) => key in DEFAULTS);

  for (const [key, value] of entries) {
    const stored = typeof value === 'boolean' ? String(value) : String(value ?? '');
    await prisma.appSetting.upsert({
      where: { key: PREFIX + key },
      create: { key: PREFIX + key, value: stored },
      update: { value: stored },
    });
  }

  cache = null;
  return getSiteSettings(true);
}

/**
 * The hosts an analytics snippet needs to reach.
 *
 * The Content-Security-Policy denies third-party scripts by default, which is
 * why pasting a snippet into a hardened site normally does nothing at all —
 * the browser blocks it silently and the operator concludes the feature is
 * broken. Reading the hosts back out of the snippet keeps the policy tight
 * while still letting the configured vendor run.
 */
/**
 * The same list, readable without awaiting.
 *
 * Helmet builds the header synchronously, and the header has to be right on
 * the very first response after a snippet is saved — an operator who pastes a
 * snippet, reloads, and sees nothing reporting will conclude the feature does
 * not work, and they will be right for as long as the two disagree. Kept in
 * step with the cache above rather than on a timer of its own.
 */
let hostCache: string[] = [];

export function currentAnalyticsHosts(): string[] {
  return hostCache;
}

export function analyticsHosts(snippet: string): string[] {
  const hosts = new Set<string>();

  for (const match of snippet.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
    hosts.add(`https://${match[1].toLowerCase()}`);
  }

  return [...hosts];
}

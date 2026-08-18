import prisma from '../utils/prisma';
import { getSiteSettings } from './siteSettings';

/**
 * What each URL should say about itself.
 *
 * A single-page app serves the same HTML for every route, so without this
 * every page in the site shares one title and one description — which is what
 * a crawler indexes, and what appears when anyone pastes a link into a chat.
 * The app itself renders fine; it is only the first response that is blank of
 * meaning, and the first response is the only one a crawler reads.
 */

export interface PageMeta {
  title: string;
  description: string;
  /** Path only; the origin is added from the site settings. */
  canonical: string;
  /** Absolute or root-relative image for link previews. */
  image?: string;
  /** True for anything private or duplicated — kept out of search results. */
  noindex: boolean;
  /** Emitted as JSON-LD when present. */
  structuredData?: Record<string, unknown>;
}

interface StaticEntry {
  title: string;
  description: string;
}

/**
 * Titles are written for a search result, not for a browser tab: the useful
 * words first, the brand last, and never the same sentence twice.
 */
const STATIC_PAGES: Record<string, StaticEntry> = {
  '/': {
    title: 'AI Course Generator: a full course in minutes',
    description:
      'Type a subject and get a complete course: written lessons, illustrations, quizzes, flashcards, certificates, and PDF or PowerPoint export, in 23 languages.',
  },
  '/pricing': {
    title: 'Pricing',
    description:
      'Start free with 10 courses. Upgrade for unlimited courses, longer outlines, PowerPoint export and audio lessons. Monthly or yearly, cancel any time.',
  },
  '/blog': {
    title: 'Blog',
    description: 'Writing on course design, learning, and getting more out of AI-generated material.',
  },
  '/contact': {
    title: 'Contact',
    description: 'Questions about a plan, a refund, or something that is not working. Every message is read.',
  },
  '/login': { title: 'Sign in', description: 'Sign in to your account.' },
  '/register': {
    title: 'Create an account',
    description: 'Create a free account and generate your first course in a few minutes.',
  },
  '/forgot-password': { title: 'Reset your password', description: 'Send a password reset link to your email.' },
  '/terms': { title: 'Terms of Service', description: 'The terms that apply to using the platform.' },
  '/privacy': { title: 'Privacy Policy', description: 'What data is collected, why, and how to have it removed.' },
  '/refund': { title: 'Refund Policy', description: 'When a payment can be refunded and how to request it.' },
  '/cancellation': { title: 'Cancellation Policy', description: 'How to cancel a subscription and what happens next.' },
};

/** Everything behind a sign-in. Indexing these wastes crawl budget on a login redirect. */
const PRIVATE_PREFIXES = [
  '/dashboard',
  '/create',
  '/course',
  '/certificate',
  '/billing',
  '/settings',
  '/notifications',
  '/bookmarks',
  '/templates',
  '/admin',
  '/reset-password',
];

/** First paragraph of a body of Markdown, trimmed to something a result page will show. */
function excerpt(markdown: string, limit = 160): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= limit) return plain;
  const cut = plain.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export async function metaForPath(pathname: string): Promise<PageMeta> {
  const site = await getSiteSettings();
  const path = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  const withBrand = (title: string) => (path === '/' ? `${site.siteName} — ${title}` : `${title} — ${site.siteName}`);

  // A published post: real title, real excerpt, its own cover image.
  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    try {
      const post = await prisma.blog.findUnique({ where: { slug: decodeURIComponent(blogMatch[1]) } });
      if (post && post.published) {
        return {
          title: withBrand(post.title),
          description: excerpt(post.content) || site.description,
          canonical: path,
          image: post.coverImage || undefined,
          noindex: false,
          structuredData: {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: excerpt(post.content),
            datePublished: post.createdAt.toISOString(),
            dateModified: post.updatedAt.toISOString(),
            image: post.coverImage || undefined,
            publisher: { '@type': 'Organization', name: site.siteName },
          },
        };
      }
    } catch {
      // Fall through to the generic description rather than failing the page.
    }
  }

  // A shared course. The link is public to anyone holding the token, so it
  // gets a proper preview — but the token was handed out by its author, not
  // published, so it stays out of search results.
  const shareMatch = path.match(/^\/(?:share|card)\/([^/]+)$/);
  if (shareMatch) {
    try {
      const course = await prisma.course.findFirst({
        where: { shareToken: decodeURIComponent(shareMatch[1]) },
        select: { id: true, title: true, language: true, topics: true },
      });
      if (course) {
        const topicCount = Array.isArray(course.topics) ? course.topics.length : 0;
        return {
          title: withBrand(course.title),
          description: topicCount
            ? `A ${topicCount}-chapter course on ${course.title}, in ${course.language}.`
            : `A course on ${course.title}, in ${course.language}.`,
          canonical: path,
          image: `/api/og/${course.id}`,
          noindex: true,
        };
      }
    } catch {
      // As above.
    }
  }

  if (PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return {
      title: site.siteName,
      description: site.description,
      canonical: path,
      noindex: true,
    };
  }

  const entry = STATIC_PAGES[path];
  if (entry) {
    return {
      title: withBrand(entry.title),
      description: entry.description,
      canonical: path,
      noindex: !site.indexable,
      structuredData:
        path === '/'
          ? {
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: site.siteName,
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'Web',
              description: entry.description,
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description: 'Free plan with 10 courses',
              },
            }
          : undefined,
    };
  }

  // Anything unrecognised is a 404 as far as the app is concerned.
  return {
    title: `Page not found — ${site.siteName}`,
    description: site.description,
    canonical: path,
    noindex: true,
  };
}

/** The paths worth putting in a sitemap, newest content first. */
export async function publicPaths(): Promise<{ path: string; lastModified?: Date; priority: number }[]> {
  const paths: { path: string; lastModified?: Date; priority: number }[] = [
    { path: '/', priority: 1 },
    { path: '/pricing', priority: 0.9 },
    { path: '/blog', priority: 0.8 },
    { path: '/contact', priority: 0.5 },
    { path: '/terms', priority: 0.3 },
    { path: '/privacy', priority: 0.3 },
    { path: '/refund', priority: 0.3 },
    { path: '/cancellation', priority: 0.3 },
  ];

  try {
    const posts = await prisma.blog.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    for (const post of posts) {
      paths.push({ path: `/blog/${post.slug}`, lastModified: post.updatedAt, priority: 0.7 });
    }
  } catch (error: any) {
    console.error('Could not list posts for the sitemap:', error.message || error);
  }

  return paths;
}

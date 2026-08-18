import { Request, Response, NextFunction } from 'express';
import { originFor, renderRobots, renderShell } from '../services/htmlShell';
import { publicPaths } from '../services/pageMeta';
import { getSiteSettings } from '../services/siteSettings';

/**
 * The origin this request arrived on, honouring the proxy headers Railway and
 * every other PaaS set. Used only when no canonical URL has been configured.
 */
const requestOrigin = (req: Request): string => `${req.protocol}://${req.get('host') || ''}`;

/** `/robots.txt` — what crawlers are allowed to spend their time on. */
export const robots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res
      .type('text/plain')
      .set('Cache-Control', 'public, max-age=3600')
      .send(await renderRobots(requestOrigin(req)));
  } catch (error) {
    next(error);
  }
};

/**
 * `/sitemap.xml` — every public page, regenerated from the database.
 *
 * Generated rather than committed, so a post published this morning is in it
 * this morning. A sitemap that has to be edited by hand is a sitemap that goes
 * stale in the first week.
 */
export const sitemap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const site = await getSiteSettings();

    if (!site.indexable) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }

    const origin = originFor(site, requestOrigin(req));
    const paths = await publicPaths();

    const urls = paths
      .map(({ path, lastModified, priority }) => {
        // A slug is generated, but it reaches this file as data and an
        // unescaped `&` makes the whole document unparseable.
        const loc = `${origin}${path}`.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        const parts = [`    <loc>${loc}</loc>`];
        if (lastModified) parts.push(`    <lastmod>${lastModified.toISOString().slice(0, 10)}</lastmod>`);
        parts.push(`    <priority>${priority.toFixed(1)}</priority>`);
        return `  <url>\n${parts.join('\n')}\n  </url>`;
      })
      .join('\n');

    res
      .type('application/xml')
      .set('Cache-Control', 'public, max-age=3600')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
      );
  } catch (error) {
    next(error);
  }
};

/** Every non-API route: the app's HTML, with this URL's own metadata in it. */
export const appShell = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.type('html').send(await renderShell(req.path, requestOrigin(req)));
  } catch (error) {
    next(error);
  }
};

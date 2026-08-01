import { lazy, ComponentType } from 'react';

/**
 * Route-level code splitting that survives a deploy.
 *
 * Vite fingerprints every chunk (`CreateCourse-a1b2c3.js`). When we ship a new
 * build, those filenames change. A tab that was opened before the deploy still
 * holds the *old* module graph, so the first navigation to a not-yet-loaded
 * route asks the server for a chunk that no longer exists. The dynamic import
 * rejects, `React.lazy` throws, and — with nothing catching it — the user gets
 * a blank white page that only a manual refresh fixes.
 *
 * Reloading once is the correct recovery: it fetches the new index.html and
 * with it the new chunk names. The session flag makes sure a genuinely broken
 * build can't put us in an endless reload loop — the second failure falls
 * through to the error boundary, which shows a real message.
 */

const RELOAD_FLAG = 'coursbit:chunk-reloaded';

const isChunkLoadError = (error: unknown): boolean => {
  const message = (error as Error)?.message || '';
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /ChunkLoadError/i.test((error as Error)?.name || '')
  );
};

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const module = await importer();
      sessionStorage.removeItem(RELOAD_FLAG);
      return module;
    } catch (error) {
      if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
        // Never resolves — the reload takes over before React can render.
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

/**
 * Vite fires this when a *preloaded* chunk 404s, which happens before our
 * importer above ever runs. Same recovery, same loop guard.
 */
export function installChunkErrorRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    if (!sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    }
  });
}

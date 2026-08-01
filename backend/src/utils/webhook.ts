import crypto from 'crypto';

/**
 * Helpers shared by the payment webhooks.
 *
 * Providers sign the exact bytes they sent. Verifying against
 * `JSON.stringify(req.body)` re-serialises a parsed object, which can reorder
 * keys or change unicode escaping and reject an event that was in fact
 * genuine — so these routes are mounted with `express.raw` and read the buffer.
 */

/** The untouched request body, whether it arrived as a Buffer or was parsed. */
export function rawBody(req: { body: unknown }): string {
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'string') return req.body;
  return JSON.stringify(req.body ?? {});
}

/** Parses a raw webhook body into an object. */
export function parsedBody<T = any>(req: { body: unknown }): T {
  if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
    try {
      return JSON.parse(rawBody(req)) as T;
    } catch {
      return {} as T;
    }
  }
  return (req.body ?? {}) as T;
}

/**
 * Constant-time hex digest comparison. A plain `!==` leaks how much of the
 * signature matched through timing, which is enough to forge one given
 * patience.
 */
export function signaturesMatch(expected: string, received: unknown): boolean {
  if (typeof received !== 'string' || received.length !== expected.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

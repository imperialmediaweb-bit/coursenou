import crypto from 'crypto';

/**
 * Short-lived signed links for file downloads.
 *
 * A download is opened with `window.open`, which cannot carry an Authorization
 * header. The two exports had each worked around that differently and both
 * were wrong: the PowerPoint route kept its auth middleware and so answered
 * 401 every time a user clicked the button, and the PDF route dropped auth
 * altogether, leaving private course material readable by anyone holding the
 * link.
 *
 * A signed token fixes both. The app asks for one over an authenticated
 * request — where ownership and plan are checked properly — and the download
 * URL carries it. The token names the exact resource, so it cannot be reused
 * for a different course, and it expires in minutes.
 */

const TTL_SECONDS = 10 * 60;

const secret = (): string =>
  process.env.DOWNLOAD_TOKEN_SECRET || process.env.JWT_SECRET || 'coursbit-download';

const sign = (payload: string): string =>
  crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

/** Token authorising one user to download one resource, for a few minutes. */
export function createDownloadToken(resource: string, id: string, userId: string): string {
  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${resource}:${id}:${userId}:${expires}`;
  return `${expires}.${userId}.${sign(payload)}`;
}

/**
 * Returns the user the token was issued to, or null if it is missing, expired,
 * malformed, or was signed for a different resource.
 */
export function verifyDownloadToken(
  token: unknown,
  resource: string,
  id: string
): string | null {
  if (typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [expiresRaw, userId, signature] = parts;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return null;

  const expected = sign(`${resource}:${id}:${userId}:${expires}`);
  if (expected.length !== signature.length) return null;

  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  } catch {
    return null;
  }

  return userId;
}

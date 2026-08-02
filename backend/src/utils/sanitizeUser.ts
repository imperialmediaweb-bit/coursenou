/**
 * Strips the fields that must never leave the server.
 *
 * Register and login each removed these inline, but `GET /auth/me` and the
 * profile update did not — so the browser received the bcrypt password hash
 * and, worse, the refresh token, which is the long-lived credential that is
 * supposed to exist only in an httpOnly cookie. Anything able to read a
 * response body (an injected script, a browser extension, a logging proxy)
 * could take a seven-day session from it.
 *
 * One function, used everywhere a user is returned, so the list cannot drift
 * apart again.
 */

const SENSITIVE = [
  'password',
  'refreshToken',
  'resetPasswordToken',
  'resetPasswordExpires',
] as const;

export function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, (typeof SENSITIVE)[number]> {
  const safe = { ...user };
  for (const field of SENSITIVE) {
    delete (safe as any)[field];
  }
  return safe as Omit<T, (typeof SENSITIVE)[number]>;
}

/** The same, for a list of users. */
export function sanitizeUsers<T extends Record<string, any>>(users: T[]) {
  return users.map(sanitizeUser);
}

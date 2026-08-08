import crypto from 'crypto';

/**
 * Encryption for credentials held in the database.
 *
 * API keys are about to be editable from the admin panel, which means they are
 * stored rather than only read from the environment. Storing a live Stripe key
 * in plain text would mean any database dump — a backup on a laptop, a support
 * export, a compromised read replica — hands over the ability to charge cards.
 * So values are sealed with AES-256-GCM, which also authenticates them: a row
 * edited by hand fails to open rather than decrypting to something unexpected.
 *
 * The key is derived from the server's own secret, the same way the JWT
 * secrets are, so it survives redeploys without being written down anywhere.
 * Set SECRET_ENCRYPTION_KEY to control it explicitly.
 */

const keyFor = (): Buffer =>
  crypto
    .createHash('sha256')
    .update(
      process.env.SECRET_ENCRYPTION_KEY ||
        process.env.JWT_SECRET ||
        process.env.DATABASE_URL ||
        'coursbit-secret-box'
    )
    .digest();

/** Sealed form: v1.<iv>.<authTag>.<ciphertext>, all base64url. */
export function seal(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFor(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

/** Returns null for anything that is missing, malformed or tampered with. */
export function open(sealed: string | null | undefined): string | null {
  if (!sealed) return null;

  const parts = sealed.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;

  try {
    const [, iv, tag, payload] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      keyFor(),
      Buffer.from(iv, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(payload, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Wrong key or altered ciphertext. Treat as absent rather than throwing,
    // so one unreadable row cannot take the whole application down.
    return null;
  }
}

/**
 * A preview safe to show in an interface: enough to recognise which key is in
 * place, never enough to use it.
 */
export function mask(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return '•'.repeat(value.length);

  const head = value.slice(0, Math.min(7, value.indexOf('_') + 1 || 4));
  return `${head}${'•'.repeat(12)}${value.slice(-4)}`;
}

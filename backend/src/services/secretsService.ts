import prisma from '../utils/prisma';
import { seal, open, mask } from '../utils/secretBox';

/**
 * Credentials the owner can set from the admin panel instead of the hosting
 * dashboard.
 *
 * Everything used to come from environment variables, which meant changing a
 * Stripe key required finding the right Railway project, editing a variable and
 * waiting for a redeploy. For someone who bought this to run a business rather
 * than to operate infrastructure, that is a wall.
 *
 * Stored values are encrypted and take precedence over the environment, so an
 * existing deployment configured through env keeps working untouched until
 * somebody sets a value here.
 */

export interface SecretDefinition {
  name: string;
  label: string;
  group: string;
  help: string;
  /** Not a credential — no point encrypting or masking a price id. */
  plain?: boolean;
}

export const SECRET_GROUPS: { id: string; title: string; description: string }[] = [
  {
    id: 'ai',
    title: 'AI providers',
    description:
      'At least one is needed for real course content. Without any, courses fall back to template text.',
  },
  {
    id: 'stripe',
    title: 'Stripe',
    description:
      'Card payments. Create the two subscription prices in your Stripe dashboard first, then paste their IDs here.',
  },
  {
    id: 'paypal',
    title: 'PayPal',
    description:
      'The webhook ID is required — without it every PayPal notification is rejected and subscriptions never activate.',
  },
  {
    id: 'razorpay',
    title: 'Razorpay',
    description: 'Charges in Indian rupees. Optional.',
  },
  {
    id: 'paystack',
    title: 'Paystack',
    description: 'Charges in Nigerian naira. Optional.',
  },
  {
    id: 'images',
    title: 'Lesson images',
    description: 'Tried in order. Without either, lessons use a neutral placeholder image.',
  },
  {
    id: 'email',
    title: 'Email (SMTP)',
    description:
      'Without these no email is sent at all, including password resets. Every skipped message is written to the server log.',
  },
];

export const SECRET_DEFINITIONS: SecretDefinition[] = [
  // ---- AI ----
  { name: 'OPENAI_API_KEY', label: 'OpenAI API key', group: 'ai', help: 'Starts with sk-. From platform.openai.com → API keys.' },
  { name: 'GEMINI_API_KEY', label: 'Google Gemini API key', group: 'ai', help: 'From aistudio.google.com → Get API key.' },
  { name: 'CLAUDE_API_KEY', label: 'Anthropic Claude API key', group: 'ai', help: 'Starts with sk-ant-. From console.anthropic.com.' },

  // ---- Stripe ----
  { name: 'STRIPE_SECRET_KEY', label: 'Secret key', group: 'stripe', help: 'Starts with sk_live_ (or sk_test_ while testing). Developers → API keys.' },
  { name: 'STRIPE_WEBHOOK_SECRET', label: 'Webhook signing secret', group: 'stripe', help: 'Starts with whsec_. Shown when you add the endpoint /api/stripe/webhook.' },
  { name: 'STRIPE_MONTHLY_PRICE_ID', label: 'Monthly price ID', group: 'stripe', plain: true, help: 'Starts with price_. From the recurring monthly price you created.' },
  { name: 'STRIPE_YEARLY_PRICE_ID', label: 'Yearly price ID', group: 'stripe', plain: true, help: 'Starts with price_. From the recurring yearly price you created.' },
  { name: 'STRIPE_PUBLISHABLE_KEY', label: 'Publishable key', group: 'stripe', plain: true, help: 'Starts with pk_. Safe to expose; used by the checkout page.' },

  // ---- PayPal ----
  { name: 'PAYPAL_CLIENT_ID', label: 'Client ID', group: 'paypal', help: 'From your app under Apps & Credentials.' },
  { name: 'PAYPAL_CLIENT_SECRET', label: 'Client secret', group: 'paypal', help: 'From the same app. Shown once — copy it when you create the app.' },
  { name: 'PAYPAL_WEBHOOK_ID', label: 'Webhook ID', group: 'paypal', plain: true, help: 'Required. Add a webhook for /api/paypal/webhook and copy the ID it gives you.' },
  { name: 'PAYPAL_MONTHLY_PLAN_ID', label: 'Monthly plan ID', group: 'paypal', plain: true, help: 'Starts with P-. From your monthly billing plan.' },
  { name: 'PAYPAL_YEARLY_PLAN_ID', label: 'Yearly plan ID', group: 'paypal', plain: true, help: 'Starts with P-. From your yearly billing plan.' },
  { name: 'PAYPAL_MODE', label: 'Mode', group: 'paypal', plain: true, help: 'live or sandbox. Leave empty for sandbox.' },

  // ---- Razorpay ----
  { name: 'RAZORPAY_KEY_ID', label: 'Key ID', group: 'razorpay', plain: true, help: 'Starts with rzp_live_ or rzp_test_.' },
  { name: 'RAZORPAY_KEY_SECRET', label: 'Key secret', group: 'razorpay', help: 'Shown once when the key pair is generated.' },
  { name: 'RAZORPAY_WEBHOOK_SECRET', label: 'Webhook secret', group: 'razorpay', help: 'Required, or webhooks are rejected.' },
  { name: 'RAZORPAY_MONTHLY_INR', label: 'Monthly price in rupees', group: 'razorpay', plain: true, help: 'Whole rupees, e.g. 899. Not derived from the dollar price.' },
  { name: 'RAZORPAY_YEARLY_INR', label: 'Yearly price in rupees', group: 'razorpay', plain: true, help: 'Whole rupees, e.g. 6999.' },

  // ---- Paystack ----
  { name: 'PAYSTACK_SECRET_KEY', label: 'Secret key', group: 'paystack', help: 'Starts with sk_live_ or sk_test_.' },
  { name: 'PAYSTACK_MONTHLY_NGN', label: 'Monthly price in naira', group: 'paystack', plain: true, help: 'Whole naira, e.g. 15000.' },
  { name: 'PAYSTACK_YEARLY_NGN', label: 'Yearly price in naira', group: 'paystack', plain: true, help: 'Whole naira, e.g. 119000.' },

  // ---- Images ----
  { name: 'PIXABAY_API_KEY', label: 'Pixabay API key', group: 'images', help: 'Free. From pixabay.com/api/docs.' },
  { name: 'UNSPLASH_ACCESS_KEY', label: 'Unsplash access key', group: 'images', help: 'Free tier available at unsplash.com/developers.' },

  // ---- Email ----
  { name: 'SMTP_HOST', label: 'SMTP host', group: 'email', plain: true, help: 'For example smtp.gmail.com.' },
  { name: 'SMTP_PORT', label: 'Port', group: 'email', plain: true, help: '587 for STARTTLS, 465 for implicit TLS.' },
  { name: 'SMTP_USER', label: 'Username', group: 'email', plain: true, help: 'Usually the full email address.' },
  { name: 'SMTP_PASS', label: 'Password', group: 'email', help: 'For Gmail this must be an app password, not your account password.' },
  { name: 'SMTP_FROM_EMAIL', label: 'From address', group: 'email', plain: true, help: 'What recipients see as the sender.' },
  { name: 'SMTP_FROM_NAME', label: 'From name', group: 'email', plain: true, help: 'Display name on outgoing email.' },
  { name: 'CONTACT_NOTIFY_EMAIL', label: 'Contact form goes to', group: 'email', plain: true, help: 'Where messages from the contact page are delivered.' },
];

const byName = new Map(SECRET_DEFINITIONS.map((d) => [d.name, d]));
const PREFIX = 'secret:';

export const isKnownSecret = (name: string): boolean => byName.has(name);

/**
 * Reads every stored value and copies it into process.env.
 *
 * Doing it this way rather than threading a lookup through every call site
 * means the payment, AI, image and email code keeps reading process.env exactly
 * as before — so this cannot introduce a subtle difference in behaviour
 * between "configured by environment" and "configured in the panel".
 */
export async function applyStoredSecrets(): Promise<number> {
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { startsWith: PREFIX } },
    });

    let applied = 0;
    for (const row of rows) {
      const name = row.key.slice(PREFIX.length);
      const definition = byName.get(name);
      if (!definition) continue;

      const value = definition.plain ? row.value : open(row.value);
      if (value === null || value === '') continue;

      process.env[name] = value;
      applied++;
    }
    return applied;
  } catch (error: any) {
    // A database that is briefly unavailable must not stop the server booting;
    // whatever is in the environment continues to apply.
    console.error('Could not load stored settings:', error.message || error);
    return 0;
  }
}

export async function setSecret(name: string, value: string): Promise<void> {
  const definition = byName.get(name);
  if (!definition) throw new Error(`Unknown setting: ${name}`);

  const stored = definition.plain ? value : seal(value);
  await prisma.appSetting.upsert({
    where: { key: PREFIX + name },
    create: { key: PREFIX + name, value: stored },
    update: { value: stored },
  });

  process.env[name] = value;
}

export async function clearSecret(name: string): Promise<void> {
  if (!byName.has(name)) throw new Error(`Unknown setting: ${name}`);
  await prisma.appSetting.deleteMany({ where: { key: PREFIX + name } });
  delete process.env[name];
  // An environment variable underneath becomes visible again on next boot.
  await applyStoredSecrets();
}

export interface SecretStatus {
  name: string;
  label: string;
  group: string;
  help: string;
  plain: boolean;
  configured: boolean;
  /** 'panel' when set here, 'environment' when inherited from hosting. */
  source: 'panel' | 'environment' | null;
  /** Masked for credentials, shown in full for identifiers and prices. */
  preview: string;
}

/** Current state of every setting — never the secret values themselves. */
export async function listSecrets(): Promise<SecretStatus[]> {
  let storedNames = new Set<string>();
  try {
    const rows = await prisma.appSetting.findMany({
      where: { key: { startsWith: PREFIX } },
      select: { key: true },
    });
    storedNames = new Set(rows.map((r) => r.key.slice(PREFIX.length)));
  } catch {
    // Fall through and report only what the environment provides.
  }

  return SECRET_DEFINITIONS.map((definition) => {
    const value = process.env[definition.name] || '';
    const configured = value !== '';
    return {
      name: definition.name,
      label: definition.label,
      group: definition.group,
      help: definition.help,
      plain: !!definition.plain,
      configured,
      source: configured ? (storedNames.has(definition.name) ? 'panel' : 'environment') : null,
      preview: configured ? (definition.plain ? value : mask(value)) : '',
    };
  });
}

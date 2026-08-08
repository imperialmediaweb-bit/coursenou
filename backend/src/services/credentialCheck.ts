/**
 * Tries a credential against the provider rather than merely noting it is
 * present.
 *
 * A key can be present and still wrong — pasted with a space, from the test
 * dashboard instead of live, or revoked months ago. Finding that out when a
 * customer's payment fails is the worst possible moment. The admin panel can
 * ask here instead and get a real answer.
 */

export interface CredentialCheck {
  group: string;
  ok: boolean;
  message: string;
  /** Present when the answer says something useful about the account. */
  detail?: string;
}

const missing = (group: string, what: string): CredentialCheck => ({
  group,
  ok: false,
  message: `${what} is not set yet.`,
});

async function checkOpenAI(): Promise<CredentialCheck> {
  if (!process.env.OPENAI_API_KEY) return missing('ai', 'The OpenAI key');
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });
    if (res.ok) return { group: 'ai', ok: true, message: 'OpenAI key works.' };
    if (res.status === 401) {
      return { group: 'ai', ok: false, message: 'OpenAI rejected this key.' };
    }
    return { group: 'ai', ok: false, message: `OpenAI answered ${res.status}.` };
  } catch (error: any) {
    return { group: 'ai', ok: false, message: `Could not reach OpenAI: ${error.message}` };
  }
}

async function checkGemini(): Promise<CredentialCheck> {
  if (!process.env.GEMINI_API_KEY) return missing('ai', 'The Gemini key');
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    if (res.ok) return { group: 'ai', ok: true, message: 'Gemini key works.' };
    return { group: 'ai', ok: false, message: `Gemini rejected this key (${res.status}).` };
  } catch (error: any) {
    return { group: 'ai', ok: false, message: `Could not reach Gemini: ${error.message}` };
  }
}

async function checkClaude(): Promise<CredentialCheck> {
  if (!process.env.CLAUDE_API_KEY) return missing('ai', 'The Claude key');
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
    });
    if (res.ok) return { group: 'ai', ok: true, message: 'Claude key works.' };
    return { group: 'ai', ok: false, message: `Claude rejected this key (${res.status}).` };
  } catch (error: any) {
    return { group: 'ai', ok: false, message: `Could not reach Claude: ${error.message}` };
  }
}

async function checkStripe(): Promise<CredentialCheck> {
  if (!process.env.STRIPE_SECRET_KEY) return missing('stripe', 'The Stripe secret key');

  try {
    const res = await fetch('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    });
    const body: any = await res.json();

    if (!res.ok) {
      return { group: 'stripe', ok: false, message: body?.error?.message || `Stripe answered ${res.status}.` };
    }

    const live = process.env.STRIPE_SECRET_KEY.startsWith('sk_live_');
    const notes: string[] = [];
    if (!live) notes.push('this is a test key, so no real money will move');
    if (!process.env.STRIPE_MONTHLY_PRICE_ID || !process.env.STRIPE_YEARLY_PRICE_ID) {
      notes.push('the monthly and yearly price IDs are still missing');
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      notes.push('the webhook secret is missing, so subscriptions will not activate on their own');
    }

    return {
      group: 'stripe',
      ok: true,
      message: `Connected to Stripe${body?.email ? ` as ${body.email}` : ''}.`,
      detail: notes.length ? `Still to do: ${notes.join('; ')}.` : undefined,
    };
  } catch (error: any) {
    return { group: 'stripe', ok: false, message: `Could not reach Stripe: ${error.message}` };
  }
}

async function checkPayPal(): Promise<CredentialCheck> {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return missing('paypal', 'The PayPal client ID and secret');
  }

  const baseUrl =
    process.env.PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

  try {
    const credentials = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const body: any = await res.json();

    if (!res.ok || !body.access_token) {
      return { group: 'paypal', ok: false, message: body?.error_description || 'PayPal rejected these credentials.' };
    }

    const notes: string[] = [];
    if (!process.env.PAYPAL_WEBHOOK_ID) {
      notes.push('the webhook ID is missing, and without it every PayPal notification is rejected');
    }
    if (!process.env.PAYPAL_MONTHLY_PLAN_ID || !process.env.PAYPAL_YEARLY_PLAN_ID) {
      notes.push('the plan IDs are still missing');
    }
    if (process.env.PAYPAL_MODE !== 'live') {
      notes.push('this is sandbox mode, so no real money will move');
    }

    return {
      group: 'paypal',
      ok: true,
      message: 'Connected to PayPal.',
      detail: notes.length ? `Still to do: ${notes.join('; ')}.` : undefined,
    };
  } catch (error: any) {
    return { group: 'paypal', ok: false, message: `Could not reach PayPal: ${error.message}` };
  }
}

async function checkRazorpay(): Promise<CredentialCheck> {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return missing('razorpay', 'The Razorpay key ID and secret');
  }
  try {
    const credentials = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/payments?count=1', {
      headers: { Authorization: `Basic ${credentials}` },
    });
    if (res.ok) return { group: 'razorpay', ok: true, message: 'Razorpay credentials work.' };
    return { group: 'razorpay', ok: false, message: `Razorpay rejected these credentials (${res.status}).` };
  } catch (error: any) {
    return { group: 'razorpay', ok: false, message: `Could not reach Razorpay: ${error.message}` };
  }
}

async function checkPaystack(): Promise<CredentialCheck> {
  if (!process.env.PAYSTACK_SECRET_KEY) return missing('paystack', 'The Paystack secret key');
  try {
    const res = await fetch('https://api.paystack.co/transaction?perPage=1', {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    if (res.ok) return { group: 'paystack', ok: true, message: 'Paystack key works.' };
    return { group: 'paystack', ok: false, message: `Paystack rejected this key (${res.status}).` };
  } catch (error: any) {
    return { group: 'paystack', ok: false, message: `Could not reach Paystack: ${error.message}` };
  }
}

async function checkEmail(): Promise<CredentialCheck> {
  const { emailService } = await import('./emailService');
  const result = await emailService.verifyConnection();
  return {
    group: 'email',
    ok: result.ok,
    message: result.ok ? 'Connected to the mail server.' : result.error || 'Could not connect.',
  };
}

async function checkImages(): Promise<CredentialCheck> {
  if (!process.env.PIXABAY_API_KEY && !process.env.UNSPLASH_ACCESS_KEY) {
    return {
      group: 'images',
      ok: false,
      message: 'Neither key is set — lessons will use a neutral placeholder image.',
    };
  }
  if (process.env.PIXABAY_API_KEY) {
    try {
      const res = await fetch(
        `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=education&per_page=3`
      );
      if (res.ok) return { group: 'images', ok: true, message: 'Pixabay key works.' };
      return { group: 'images', ok: false, message: `Pixabay rejected this key (${res.status}).` };
    } catch (error: any) {
      return { group: 'images', ok: false, message: `Could not reach Pixabay: ${error.message}` };
    }
  }
  return { group: 'images', ok: true, message: 'An Unsplash key is set.' };
}

/** Runs the check for one group and reports what it found. */
export async function testProviderCredentials(group: string): Promise<CredentialCheck[]> {
  switch (group) {
    case 'ai':
      return Promise.all([checkOpenAI(), checkGemini(), checkClaude()]);
    case 'stripe':
      return [await checkStripe()];
    case 'paypal':
      return [await checkPayPal()];
    case 'razorpay':
      return [await checkRazorpay()];
    case 'paystack':
      return [await checkPaystack()];
    case 'email':
      return [await checkEmail()];
    case 'images':
      return [await checkImages()];
    default:
      return [{ group, ok: false, message: 'There is nothing to test for this group.' }];
  }
}

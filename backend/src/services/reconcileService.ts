import prisma from '../utils/prisma';
import { paymentService } from './paymentService';
import { priceFor } from '../utils/planLimits';

/**
 * Recovers a payment whose webhook never arrived.
 *
 * A webhook can be lost for entirely ordinary reasons — the deployment was
 * restarting, the provider's delivery failed, the endpoint was briefly
 * unreachable. The customer has been charged and is looking at a free account,
 * which is the single most infuriating way for this product to fail.
 *
 * So when someone returns from checkout, we ask the provider directly whether
 * they have an active subscription rather than waiting to be told.
 *
 * The safety rule is deliberately narrow: activate **only** if the account is
 * still on the free plan or its access has already lapsed. If the webhook did
 * arrive, this finds a paid account and does nothing — so it cannot extend a
 * subscription twice, no matter how often the page is refreshed.
 */

interface ReconcileResult {
  activated: boolean;
  provider?: string;
  plan?: 'monthly' | 'yearly';
  reason: string;
}

const alreadyPaid = (user: { plan: string; planExpiresAt: Date | null }): boolean =>
  user.plan !== 'free' && !!user.planExpiresAt && user.planExpiresAt > new Date();

async function checkStripe(user: any): Promise<ReconcileResult | null> {
  if (!process.env.STRIPE_SECRET_KEY || !user.stripeCustomerId) return null;

  try {
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-09-30.acacia',
    });

    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1,
    });

    const subscription = subs.data[0];
    if (!subscription) return null;

    const priceId = subscription.items?.data?.[0]?.price?.id;
    const plan: 'monthly' | 'yearly' =
      priceId === process.env.STRIPE_YEARLY_PRICE_ID ? 'yearly' : 'monthly';

    await paymentService.activateSubscription({
      userId: user.id,
      plan,
      provider: 'stripe',
      providerId: subscription.id,
      amount: priceFor('stripe', plan).major,
      currency: priceFor('stripe', plan).currency,
      // Keyed on the subscription and its current period, so a webhook that
      // turns up late for the same period is recognised as a duplicate.
      eventId: `stripe:reconcile:${subscription.id}:${subscription.current_period_start}`,
    });

    return { activated: true, provider: 'stripe', plan, reason: 'Active Stripe subscription found' };
  } catch (error: any) {
    console.error('Stripe reconciliation failed:', error.message || error);
    return null;
  }
}

async function checkPayPal(user: any): Promise<ReconcileResult | null> {
  if (!process.env.PAYPAL_CLIENT_ID || !user.paypalSubscriptionId) return null;

  try {
    const baseUrl =
      process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    const credentials = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const { access_token: accessToken } = (await tokenRes.json()) as any;
    if (!accessToken) return null;

    const subRes = await fetch(
      `${baseUrl}/v1/billing/subscriptions/${user.paypalSubscriptionId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const subscription = (await subRes.json()) as any;
    if (subscription.status !== 'ACTIVE') return null;

    const plan: 'monthly' | 'yearly' =
      subscription.plan_id === process.env.PAYPAL_MONTHLY_PLAN_ID ? 'monthly' : 'yearly';

    await paymentService.activateSubscription({
      userId: user.id,
      plan,
      provider: 'paypal',
      providerId: subscription.id,
      amount: priceFor('paypal', plan).major,
      currency: priceFor('paypal', plan).currency,
      eventId: `paypal:reconcile:${subscription.id}:${subscription.billing_info?.last_payment?.time || ''}`,
    });

    return { activated: true, provider: 'paypal', plan, reason: 'Active PayPal subscription found' };
  } catch (error: any) {
    console.error('PayPal reconciliation failed:', error.message || error);
    return null;
  }
}

/** Asks every configured provider whether this account has actually paid. */
export async function reconcileSubscription(userId: string): Promise<ReconcileResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { activated: false, reason: 'User not found' };
  }

  if (alreadyPaid(user)) {
    return { activated: false, reason: 'Subscription is already active' };
  }

  const result = (await checkStripe(user)) || (await checkPayPal(user));
  if (result) return result;

  return { activated: false, reason: 'No active subscription found at any provider' };
}

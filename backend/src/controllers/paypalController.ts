import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
import { paymentService } from '../services/paymentService';
import { priceFor } from '../utils/planLimits';

/**
 * Fails loudly and clearly when the provider has no credentials. Without this
 * an unconfigured provider threw deep inside the API call and reached the user
 * as a generic 500 "An unexpected error occurred", which says nothing about
 * what is actually wrong.
 */
const assertPayPalConfigured = (): void => {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new AppError('PayPal is not configured', 503);
  }
};

const getPayPalBaseUrl = (): string => {
  return process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
};

const getPayPalAccessToken = async (): Promise<string> => {
  const baseUrl = getPayPalBaseUrl();
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data: any = await response.json();
  return data.access_token;
};

export const createSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { plan } = req.body;
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      throw new AppError('Invalid plan. Must be "monthly" or "yearly"', 400);
    }

    assertPayPalConfigured();
    if (!process.env.PAYPAL_MONTHLY_PLAN_ID || !process.env.PAYPAL_YEARLY_PLAN_ID) {
      throw new AppError('PayPal plans are not configured', 503);
    }

    const user = req.user!;
    const baseUrl = getPayPalBaseUrl();
    const accessToken = await getPayPalAccessToken();

    const planId =
      plan === 'monthly'
        ? process.env.PAYPAL_MONTHLY_PLAN_ID!
        : process.env.PAYPAL_YEARLY_PLAN_ID!;

    const response = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: planId,
        subscriber: {
          name: {
            given_name: user.name.split(' ')[0],
            surname: user.name.split(' ').slice(1).join(' ') || '',
          },
          email_address: user.email,
        },
        custom_id: user.id.toString(),
        application_context: {
          brand_name: process.env.BRAND_NAME || 'Coursbit',
          return_url: `${process.env.FRONTEND_URL}/billing?paypal=true&plan=${plan}`,
          cancel_url: `${process.env.FRONTEND_URL}/billing?cancelled=true`,
          user_action: 'SUBSCRIBE_NOW',
        },
      }),
    });

    const data: any = await response.json();
    const approvalLink = data.links?.find(
      (link: any) => link.rel === 'approve'
    );

    if (!approvalLink) {
      throw new AppError('Failed to create PayPal subscription', 500);
    }

    res.status(200).json({ url: approvalLink.href });
  } catch (error) {
    next(error);
  }
};

export const capture = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    assertPayPalConfigured();

    const { subscriptionId } = req.body;
    if (!subscriptionId) {
      throw new AppError('Subscription ID is required', 400);
    }

    const baseUrl = getPayPalBaseUrl();
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(
      `${baseUrl}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const subscription: any = await response.json();

    if (subscription.status !== 'ACTIVE') {
      throw new AppError('Subscription is not active', 400);
    }

    const userId = subscription.custom_id || req.user!._id.toString();
    const plan = subscription.plan_id === process.env.PAYPAL_MONTHLY_PLAN_ID
      ? 'monthly'
      : 'yearly';

    await paymentService.activateSubscription({
      userId,
      plan: plan as 'monthly' | 'yearly',
      provider: 'paypal',
      providerId: subscriptionId,
      amount: priceFor('paypal', plan as 'monthly' | 'yearly').major,
      currency: priceFor('paypal', plan as 'monthly' | 'yearly').currency,
    });

    res.status(200).json({ message: 'Subscription activated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirms the request really came from PayPal.
 *
 * Without this, anyone who knows the URL can POST a
 * BILLING.SUBSCRIPTION.ACTIVATED body with any user id in `custom_id` and get
 * a paid plan for free — the handler below acts on the payload directly.
 * PayPal has no HMAC header; verification is a call to their API with the
 * transmission headers plus the webhook id we registered.
 */
const isVerifiedPayPalEvent = async (req: AuthRequest): Promise<boolean> => {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error('PAYPAL_WEBHOOK_ID is not set — rejecting PayPal webhook');
    return false;
  }

  const required = [
    'paypal-transmission-id',
    'paypal-transmission-time',
    'paypal-transmission-sig',
    'paypal-cert-url',
    'paypal-auth-algo',
  ];
  if (required.some((header) => !req.headers[header])) return false;

  try {
    const accessToken = await getPayPalAccessToken();
    const response = await fetch(
      `${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_algo: req.headers['paypal-auth-algo'],
          cert_url: req.headers['paypal-cert-url'],
          transmission_id: req.headers['paypal-transmission-id'],
          transmission_sig: req.headers['paypal-transmission-sig'],
          transmission_time: req.headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: req.body,
        }),
      }
    );

    const result: any = await response.json();
    return result.verification_status === 'SUCCESS';
  } catch (error: any) {
    console.error('PayPal webhook verification failed:', error.message || error);
    return false;
  }
};

export const webhook = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!(await isVerifiedPayPalEvent(req))) {
      throw new AppError('Invalid webhook signature', 400);
    }

    const event = req.body;
    const eventType = event.event_type;

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const resource = event.resource;
        const subscriptionId = resource.id;
        const userId = resource.custom_id;
        const plan =
          resource.plan_id === process.env.PAYPAL_MONTHLY_PLAN_ID
            ? 'monthly'
            : 'yearly';

        await paymentService.activateSubscription({
          userId,
          plan: plan as 'monthly' | 'yearly',
          provider: 'paypal',
          providerId: subscriptionId,
          amount: priceFor('paypal', plan as 'monthly' | 'yearly').major,
          currency: priceFor('paypal', plan as 'monthly' | 'yearly').currency,
        });
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        const resource = event.resource;
        const subscriptionId = resource.id;
        const user = await prisma.user.findFirst({
          where: { paypalSubscriptionId: subscriptionId },
        });
        if (user) {
          await paymentService.cancelSubscription(
            user.id.toString(),
            'paypal'
          );
        }
        break;
      }

      case 'PAYMENT.SALE.COMPLETED': {
        const resource = event.resource;
        const billingAgreementId = resource.billing_agreement_id;
        const user = await prisma.user.findFirst({
          where: { paypalSubscriptionId: billingAgreementId },
        });
        if (user) {
          const plan = user.plan as 'monthly' | 'yearly';
          await paymentService.renewSubscription({
            userId: user.id.toString(),
            plan,
            provider: 'paypal',
            amount: priceFor('paypal', plan).major,
            currency: priceFor('paypal', plan).currency,
          });
        }
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!._id as string } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.paypalSubscriptionId) {
      throw new AppError('No active PayPal subscription found', 400);
    }

    const baseUrl = getPayPalBaseUrl();
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(
      `${baseUrl}/v1/billing/subscriptions/${user.paypalSubscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'User requested cancellation' }),
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new AppError('Failed to cancel PayPal subscription', 500);
    }

    await paymentService.cancelSubscription(user.id.toString(), 'paypal');

    res.status(200).json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    next(error);
  }
};

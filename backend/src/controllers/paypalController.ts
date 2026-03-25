import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import User from '../models/User';
import { paymentService } from '../services/paymentService';

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
        custom_id: user._id.toString(),
        application_context: {
          brand_name: 'CourseBit',
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
      amount: plan === 'monthly' ? 9.99 : 79.99,
      currency: 'usd',
    });

    res.status(200).json({ message: 'Subscription activated successfully' });
  } catch (error) {
    next(error);
  }
};

export const webhook = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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
          amount: plan === 'monthly' ? 9.99 : 79.99,
          currency: 'usd',
        });
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        const resource = event.resource;
        const subscriptionId = resource.id;
        const user = await User.findOne({
          paypalSubscriptionId: subscriptionId,
        });
        if (user) {
          await paymentService.cancelSubscription(
            user._id.toString(),
            'paypal'
          );
        }
        break;
      }

      case 'PAYMENT.SALE.COMPLETED': {
        const resource = event.resource;
        const billingAgreementId = resource.billing_agreement_id;
        const user = await User.findOne({
          paypalSubscriptionId: billingAgreementId,
        });
        if (user) {
          const plan = user.plan as 'monthly' | 'yearly';
          await paymentService.renewSubscription({
            userId: user._id.toString(),
            plan,
            provider: 'paypal',
            amount: plan === 'monthly' ? 9.99 : 79.99,
            currency: 'usd',
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
    const user = await User.findById(req.user!._id);
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

    await paymentService.cancelSubscription(user._id.toString(), 'paypal');

    res.status(200).json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    next(error);
  }
};

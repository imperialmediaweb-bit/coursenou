import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
import { paymentService } from '../services/paymentService';
import { priceFor } from '../utils/planLimits';
import { rawBody, parsedBody, signaturesMatch } from '../utils/webhook';

const assertPaystackConfigured = (): void => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new AppError('Paystack is not configured', 503);
  }
};

export const initialize = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    assertPaystackConfigured();

    const { plan } = req.body;
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      throw new AppError('Invalid plan. Must be "monthly" or "yearly"', 400);
    }

    // Paystack takes kobo. The old figures were derived from the USD price
    // and billed roughly a thousand naira for a plan sold at $9.99.
    const amount = priceFor('paystack', plan as 'monthly' | 'yearly').minor;

    const response = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          email: req.user!.email,
          metadata: {
            userId: req.user!._id.toString(),
            plan,
          },
          callback_url: `${process.env.FRONTEND_URL}/billing?paystack=true`,
        }),
      }
    );

    const data: any = await response.json();

    if (!data.status) {
      throw new AppError('Failed to initialize Paystack transaction', 500);
    }

    res.status(200).json({ authorization_url: data.data.authorization_url });
  } catch (error) {
    next(error);
  }
};

export const verify = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    assertPaystackConfigured();

    const { reference } = req.params;
    if (!reference) {
      throw new AppError('Reference is required', 400);
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data: any = await response.json();

    if (!data.status || data.data.status !== 'success') {
      throw new AppError('Payment verification failed', 400);
    }

    const metadata = data.data.metadata || {};
    const userId = metadata.userId || req.user!._id.toString();
    const plan: 'monthly' | 'yearly' = metadata.plan === 'yearly' ? 'yearly' : 'monthly';

    // A reference belongs to whoever initialised it; do not let one account
    // redeem another's payment.
    if (userId !== req.user!._id.toString()) {
      throw new AppError('This payment belongs to a different account', 403);
    }

    const price = priceFor('paystack', plan);

    await paymentService.activateSubscription({
      userId,
      plan,
      provider: 'paystack',
      providerId: data.data.reference,
      amount: price.major,
      currency: price.currency,
      eventId: `paystack:${data.data.reference}`,
    });

    res.status(200).json({ message: 'Payment verified and subscription activated' });
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
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error('PAYSTACK_SECRET_KEY is not set — rejecting webhook');
      throw new AppError('Webhook is not configured', 503);
    }

    const hash = crypto
      .createHmac('sha512', secret)
      .update(rawBody(req))
      .digest('hex');

    if (!signaturesMatch(hash, req.headers['x-paystack-signature'])) {
      throw new AppError('Invalid webhook signature', 400);
    }

    const event = parsedBody(req);

    if (event.event === 'charge.success') {
      const data = event.data || {};
      const metadata = data.metadata || {};
      const userId = metadata.userId;
      const plan: 'monthly' | 'yearly' = metadata.plan === 'yearly' ? 'yearly' : 'monthly';

      if (userId) {
        const price = priceFor('paystack', plan);

        await paymentService.activateSubscription({
          userId,
          plan,
          provider: 'paystack',
          providerId: data.reference,
          amount: price.major,
          currency: price.currency,
          eventId: `paystack:${data.reference}`,
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

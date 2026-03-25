import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import User from '../models/User';
import { paymentService } from '../services/paymentService';

export const initialize = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { plan } = req.body;
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      throw new AppError('Invalid plan. Must be "monthly" or "yearly"', 400);
    }

    const amount = plan === 'monthly' ? 999 * 100 : 7999 * 100; // amount in kobo

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

    const { metadata } = data.data;
    const userId = metadata.userId || req.user!._id.toString();
    const plan = metadata.plan as 'monthly' | 'yearly';
    const amount = plan === 'monthly' ? 9.99 : 79.99;

    await paymentService.activateSubscription({
      userId,
      plan,
      provider: 'paystack',
      providerId: data.data.reference,
      amount,
      currency: 'ngn',
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
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(JSON.stringify(req.body))
      .digest('hex');

    const signature = req.headers['x-paystack-signature'] as string;

    if (hash !== signature) {
      throw new AppError('Invalid webhook signature', 400);
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const data = event.data;
      const metadata = data.metadata || {};
      const userId = metadata.userId;
      const plan = metadata.plan as 'monthly' | 'yearly';

      if (userId && plan) {
        const amount = plan === 'monthly' ? 9.99 : 79.99;

        await paymentService.activateSubscription({
          userId,
          plan,
          provider: 'paystack',
          providerId: data.reference,
          amount,
          currency: 'ngn',
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

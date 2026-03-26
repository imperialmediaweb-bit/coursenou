import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
import { paymentService } from '../services/paymentService';

export const createOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { plan } = req.body;
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      throw new AppError('Invalid plan. Must be "monthly" or "yearly"', 400);
    }

    const amount = plan === 'monthly' ? 999 : 7999; // amount in paise

    const credentials = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `receipt_${req.user!._id}_${Date.now()}`,
        notes: {
          userId: req.user!._id.toString(),
          plan,
        },
      }),
    });

    if (!response.ok) {
      throw new AppError('Failed to create Razorpay order', 500);
    }

    const order = await response.json();
    res.status(200).json(order);
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError(
        'Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature',
        400
      );
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new AppError('Invalid payment signature', 400);
    }

    const validPlan = plan === 'yearly' ? 'yearly' : 'monthly';
    const amount = validPlan === 'monthly' ? 9.99 : 79.99;

    await paymentService.activateSubscription({
      userId: req.user!._id.toString(),
      plan: validPlan,
      provider: 'razorpay',
      providerId: razorpay_payment_id,
      amount,
      currency: 'inr',
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
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const receivedSignature = req.headers['x-razorpay-signature'] as string;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== receivedSignature) {
      throw new AppError('Invalid webhook signature', 400);
    }

    const event = req.body;

    if (event.event === 'payment.authorized') {
      const payment = event.payload.payment.entity;
      const notes = payment.notes || {};
      const userId = notes.userId;
      const plan = notes.plan || 'monthly';

      if (userId) {
        await paymentService.activateSubscription({
          userId,
          plan: plan as 'monthly' | 'yearly',
          provider: 'razorpay',
          providerId: payment.id,
          amount: plan === 'monthly' ? 9.99 : 79.99,
          currency: 'inr',
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

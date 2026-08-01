import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
import { paymentService } from '../services/paymentService';
import { priceFor } from '../utils/planLimits';
import { rawBody, parsedBody, signaturesMatch } from '../utils/webhook';

const razorpayAuthHeader = (): string =>
  'Basic ' +
  Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString('base64');

/** Reads an order back from Razorpay so its notes can be trusted. */
const fetchRazorpayOrder = async (orderId: string): Promise<any | null> => {
  try {
    const response = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: { Authorization: razorpayAuthHeader() },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error: any) {
    console.error('Failed to fetch Razorpay order:', error.message || error);
    return null;
  }
};

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

    // Razorpay expects paise. This used to send the USD figure straight
    // through, so a $9.99 plan was billed as 999 paise (about 12 cents).
    const amount = priceFor('razorpay', plan as 'monthly' | 'yearly').minor;

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

    // The signature only covers order_id|payment_id, so `plan` from the
    // request body is attacker-controlled: pay for a month, ask for a year.
    // The authoritative value is the note we attached when creating the order.
    const order = await fetchRazorpayOrder(razorpay_order_id);
    const orderUserId = order?.notes?.userId;
    const validPlan: 'monthly' | 'yearly' =
      order?.notes?.plan === 'yearly' ? 'yearly' : 'monthly';

    if (!order || order.status === 'created') {
      throw new AppError('Payment has not been captured yet', 400);
    }
    if (orderUserId && orderUserId !== req.user!._id.toString()) {
      throw new AppError('This order belongs to a different account', 403);
    }

    const price = priceFor('razorpay', validPlan);

    await paymentService.activateSubscription({
      userId: req.user!._id.toString(),
      plan: validPlan,
      provider: 'razorpay',
      providerId: razorpay_payment_id,
      amount: price.major,
      currency: price.currency,
      eventId: `razorpay:${razorpay_payment_id}`,
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
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not set — rejecting webhook');
      throw new AppError('Webhook is not configured', 503);
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody(req))
      .digest('hex');

    if (!signaturesMatch(expectedSignature, req.headers['x-razorpay-signature'])) {
      throw new AppError('Invalid webhook signature', 400);
    }

    const event = parsedBody(req);

    if (event.event === 'payment.authorized' || event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      const notes = payment?.notes || {};
      const userId = notes.userId;
      const plan: 'monthly' | 'yearly' = notes.plan === 'yearly' ? 'yearly' : 'monthly';

      if (userId && payment) {
        const price = priceFor('razorpay', plan);
        await paymentService.activateSubscription({
          userId,
          plan,
          provider: 'razorpay',
          providerId: payment.id,
          amount: price.major,
          currency: price.currency,
          eventId: `razorpay:${payment.id}`,
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

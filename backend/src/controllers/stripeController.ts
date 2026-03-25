import { Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import User from '../models/User';
import { paymentService } from '../services/paymentService';
import { emailService } from '../services/emailService';

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe is not configured', 503);
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-09-30.acacia' as any,
  });
};

export const createCheckout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { plan } = req.body;
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      throw new AppError('Invalid plan. Must be "monthly" or "yearly"', 400);
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Find or create Stripe customer
    if (!user.stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const priceId =
      plan === 'monthly'
        ? process.env.STRIPE_MONTHLY_PRICE_ID!
        : process.env.STRIPE_YEARLY_PRICE_ID!;

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/billing?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/billing?cancelled=true`,
      customer: user.stripeCustomerId,
      metadata: {
        userId: user._id.toString(),
        plan,
      },
    });

    res.status(200).json({ url: session.url });
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
    const rawBody = req.body as Buffer;
    const sig = req.headers['stripe-signature'] as string;

    const event = getStripe().webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, plan } = session.metadata!;
        const subscriptionId = session.subscription as string;

        await paymentService.activateSubscription({
          userId,
          plan: plan as 'monthly' | 'yearly',
          provider: 'stripe',
          providerId: subscriptionId,
          amount: plan === 'monthly' ? 9.99 : 79.99,
          currency: 'usd',
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await User.findOne({
          stripeSubscriptionId: subscription.id,
        });
        if (user) {
          await paymentService.cancelSubscription(
            user._id.toString(),
            'stripe'
          );
          await paymentService.handleExpiredSubscription(user._id.toString());
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          await emailService.sendPaymentFailed(user.email, user.name);
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

    if (!user.stripeSubscriptionId) {
      throw new AppError('No active Stripe subscription found', 400);
    }

    await getStripe().subscriptions.cancel(user.stripeSubscriptionId);
    await paymentService.cancelSubscription(user._id.toString(), 'stripe');

    res.status(200).json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    next(error);
  }
};

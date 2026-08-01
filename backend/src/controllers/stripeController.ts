import { Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
import { paymentService } from '../services/paymentService';
import { emailService } from '../services/emailService';
import { priceFor } from '../utils/planLimits';

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

    const user = await prisma.user.findUnique({ where: { id: req.user!._id as string } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Find or create Stripe customer
    if (!user.stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id.toString() },
      });
      user.stripeCustomerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: user.stripeCustomerId } });
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
        userId: user.id.toString(),
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
          amount: priceFor('stripe', plan as 'monthly' | 'yearly').major,
          currency: priceFor('stripe', plan as 'monthly' | 'yearly').currency,
          eventId: event.id,
        });
        break;
      }

      // Every renewal after the first payment arrives as an invoice event.
      // Without this the plan expiry set at checkout simply lapses and the
      // auth middleware downgrades a customer who is still being charged.
      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // The first invoice is already handled by checkout.session.completed.
        if (invoice.billing_reason === 'subscription_create') break;

        const customerId = invoice.customer as string;
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!user) break;

        const plan = (user.plan === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly';
        await paymentService.renewSubscription({
          userId: user.id,
          plan,
          provider: 'stripe',
          amount: (invoice.amount_paid ?? 0) / 100 || priceFor('stripe', plan).major,
          currency: invoice.currency || priceFor('stripe', plan).currency,
          receiptUrl: invoice.hosted_invoice_url || undefined,
          eventId: event.id,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (user) {
          await paymentService.cancelSubscription(
            user.id.toString(),
            'stripe'
          );
          await paymentService.handleExpiredSubscription(user.id.toString());
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
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
    const user = await prisma.user.findUnique({ where: { id: req.user!._id as string } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.stripeSubscriptionId) {
      throw new AppError('No active Stripe subscription found', 400);
    }

    await getStripe().subscriptions.cancel(user.stripeSubscriptionId);
    await paymentService.cancelSubscription(user.id.toString(), 'stripe');

    res.status(200).json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    next(error);
  }
};

import prisma from '../utils/prisma';
import { emailService } from './emailService';
import { notificationService } from './notificationService';

type Provider = 'stripe' | 'paypal' | 'razorpay' | 'paystack';
type BillingPlan = 'monthly' | 'yearly';

/** Adds one billing period to a starting point. */
const addPeriod = (from: Date, plan: BillingPlan): Date => {
  const next = new Date(from.getTime());
  if (plan === 'monthly') next.setMonth(next.getMonth() + 1);
  else next.setFullYear(next.getFullYear() + 1);
  return next;
};

/**
 * Renewals must extend the time the customer already paid for. Computing the
 * new expiry from `now` silently discarded whatever was left on the current
 * period whenever a payment arrived early.
 */
const extendFrom = (currentExpiry: Date | null | undefined, plan: BillingPlan): Date => {
  const now = new Date();
  const base = currentExpiry && currentExpiry > now ? new Date(currentExpiry) : now;
  return addPeriod(base, plan);
};

class PaymentService {
  /**
   * Claims a provider event, so that only one delivery of it does any work.
   *
   * Providers retry webhooks until they get a 2xx, and a retry used to create a
   * second invoice and send a second email. Checking for an existing row first
   * fixed the ordinary case but not the real one: Stripe can deliver the same
   * event twice at the same moment, both checks find nothing, and the customer
   * gets two months for one payment. Money is exactly the wrong place for a
   * read-then-write race.
   *
   * So the invoice row is the claim rather than a record written afterwards.
   * `providerInvoiceId` is unique, the insert either wins or violates the
   * constraint, and the database decides — atomically, whatever the ordering.
   */
  private async claimEvent(params: {
    userId: string;
    amount: number;
    currency: string;
    plan: BillingPlan;
    provider: Provider;
    receiptUrl?: string;
    /** Falls back to the subscription id when a provider sends no event id. */
    key?: string;
  }): Promise<boolean> {
    try {
      await prisma.invoice.create({
        data: {
          userId: params.userId,
          amount: params.amount,
          currency: params.currency,
          plan: params.plan,
          provider: params.provider,
          status: 'paid',
          receiptUrl: params.receiptUrl || null,
          providerInvoiceId: params.key || null,
        },
      });
      return true;
    } catch (error: any) {
      // P2002 is the unique violation: someone else already claimed this event.
      if (error?.code === 'P2002') {
        console.log(`Skipping duplicate ${params.provider} event ${params.key}`);
        return false;
      }
      throw error;
    }
  }

  async activateSubscription(params: {
    userId: string;
    plan: BillingPlan;
    provider: Provider;
    providerId: string;
    amount: number;
    currency: string;
    receiptUrl?: string;
    eventId?: string;
  }): Promise<any> {
    const { userId, plan, provider, providerId, amount, currency, receiptUrl, eventId } =
      params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Claimed before anything is extended, so a replay cannot add a second
    // period. If this loses the race the event has already been handled.
    const claimed = await this.claimEvent({
      userId: user.id,
      amount,
      currency,
      plan,
      provider,
      receiptUrl,
      key: eventId || providerId,
    });
    if (!claimed) return user as any;

    const planExpiresAt = extendFrom(user.planExpiresAt, plan);

    // Save provider subscription ID
    const providerData: any = { plan, planExpiresAt };
    switch (provider) {
      case 'stripe':
        providerData.stripeSubscriptionId = providerId;
        break;
      case 'paypal':
        providerData.paypalSubscriptionId = providerId;
        break;
      case 'razorpay':
        providerData.razorpaySubscriptionId = providerId;
        break;
      case 'paystack':
        providerData.paystackCustomerCode = providerId;
        break;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: providerData,
    });

    await prisma.subscription.upsert({
      where: {
        userId_provider: { userId: user.id, provider },
      },
      create: {
        userId: user.id,
        provider,
        planType: plan,
        status: 'active',
        startDate: new Date(),
        endDate: planExpiresAt,
        providerId,
      },
      update: {
        planType: plan,
        status: 'active',
        endDate: planExpiresAt,
        providerId,
      },
    });

    // Notifying must never fail the payment itself — the money has moved.
    await Promise.allSettled([
      emailService.sendSubscriptionConfirmation(
        updatedUser.email,
        updatedUser.name,
        plan,
        amount,
        currency,
        planExpiresAt
      ),
      notificationService.subscriptionActivated(user.id, plan, planExpiresAt),
    ]);

    return updatedUser as any;
  }

  async cancelSubscription(userId: string, provider: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id, provider, status: 'active' },
    });
    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'cancelled' },
      });
    }

    // User keeps access until planExpiresAt
    const expiresAt = user.planExpiresAt || new Date();

    await Promise.allSettled([
      emailService.sendSubscriptionCancelled(user.email, user.name, expiresAt),
      notificationService.subscriptionCancelled(user.id, expiresAt),
    ]);
  }

  async handleExpiredSubscription(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: 'free', planExpiresAt: null },
    });
  }

  async renewSubscription(params: {
    userId: string;
    plan: BillingPlan;
    provider: Provider;
    amount: number;
    currency: string;
    receiptUrl?: string;
    eventId?: string;
  }): Promise<void> {
    const { userId, plan, provider, amount, currency, receiptUrl, eventId } = params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const claimed = await this.claimEvent({
      userId: user.id,
      amount,
      currency,
      plan,
      provider,
      receiptUrl,
      key: eventId,
    });
    if (!claimed) return;

    const planExpiresAt = extendFrom(user.planExpiresAt, plan);

    await prisma.user.update({
      where: { id: userId },
      data: { plan, planExpiresAt },
    });

    await prisma.subscription.updateMany({
      where: { userId: user.id, provider },
      data: { status: 'active', endDate: planExpiresAt },
    });

    await Promise.allSettled([
      emailService.sendRecurringPayment(user.email, user.name, plan, amount, currency, receiptUrl),
      notificationService.paymentReceived(user.id, amount, currency, planExpiresAt),
    ]);
  }
}

export const paymentService = new PaymentService();

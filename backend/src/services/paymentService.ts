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
   * Providers retry webhooks until they get a 2xx, and a retry used to create
   * a second invoice and send a second email. An invoice row keyed by the
   * provider's own event id makes replays no-ops.
   */
  private async alreadyProcessed(eventId?: string): Promise<boolean> {
    if (!eventId) return false;
    const existing = await prisma.invoice.findFirst({
      where: { providerInvoiceId: eventId },
      select: { id: true },
    });
    return !!existing;
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

    if (await this.alreadyProcessed(eventId)) {
      console.log(`Skipping duplicate ${provider} event ${eventId}`);
      return prisma.user.findUnique({ where: { id: userId } });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

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

    await prisma.invoice.create({
      data: {
        userId: user.id,
        amount,
        currency,
        plan,
        provider,
        status: 'paid',
        receiptUrl: receiptUrl || null,
        providerInvoiceId: eventId || providerId,
      },
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

    if (await this.alreadyProcessed(eventId)) {
      console.log(`Skipping duplicate ${provider} renewal ${eventId}`);
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const planExpiresAt = extendFrom(user.planExpiresAt, plan);

    await prisma.user.update({
      where: { id: userId },
      data: { plan, planExpiresAt },
    });

    await prisma.invoice.create({
      data: {
        userId: user.id,
        amount,
        currency,
        plan,
        provider,
        status: 'paid',
        receiptUrl: receiptUrl || null,
        providerInvoiceId: eventId || null,
      },
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

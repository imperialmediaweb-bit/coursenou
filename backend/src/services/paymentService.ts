
import prisma from '../utils/prisma';
import { emailService } from './emailService';

class PaymentService {
  async activateSubscription(params: {
    userId: string;
    plan: 'monthly' | 'yearly';
    provider: 'stripe' | 'paypal' | 'razorpay' | 'paystack';
    providerId: string;
    amount: number;
    currency: string;
    receiptUrl?: string;
  }): Promise<any> {
    const { userId, plan, provider, providerId, amount, currency, receiptUrl } = params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Set plan and expiration
    const now = new Date();
    let planExpiresAt: Date;
    if (plan === 'monthly') {
      planExpiresAt = new Date(now.setMonth(now.getMonth() + 1));
    } else {
      planExpiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
    }

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

    // Create invoice
    await prisma.invoice.create({
      data: {
        userId: user.id,
        amount,
        currency,
        plan,
        provider,
        status: 'paid',
        receiptUrl: receiptUrl || null,
        providerInvoiceId: providerId,
      },
    });

    // Create subscription record
    const startDate = new Date();
    const endDate = new Date(updatedUser.planExpiresAt!);
    await prisma.subscription.upsert({
      where: {
        userId_provider: { userId: user.id, provider },
      },
      create: {
        userId: user.id,
        provider,
        planType: plan,
        status: 'active',
        startDate,
        endDate,
        providerId,
      },
      update: {
        planType: plan,
        status: 'active',
        startDate,
        endDate,
        providerId,
      },
    });

    // Send confirmation email
    await emailService.sendSubscriptionConfirmation(
      updatedUser.email,
      updatedUser.name,
      plan,
      amount,
      currency,
      endDate
    );

    return updatedUser as any;
  }

  async cancelSubscription(userId: string, provider: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Update subscription record
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

    await emailService.sendSubscriptionCancelled(
      user.email,
      user.name,
      expiresAt
    );
  }

  async handleExpiredSubscription(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { plan: 'free', planExpiresAt: null },
    });
  }

  async renewSubscription(params: {
    userId: string;
    plan: 'monthly' | 'yearly';
    provider: 'stripe' | 'paypal' | 'razorpay' | 'paystack';
    amount: number;
    currency: string;
    receiptUrl?: string;
  }): Promise<void> {
    const { userId, plan, provider, amount, currency, receiptUrl } = params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // Extend plan
    const now = new Date();
    let planExpiresAt: Date;
    if (plan === 'monthly') {
      planExpiresAt = new Date(now.setMonth(now.getMonth() + 1));
    } else {
      planExpiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
    }

    await prisma.user.update({
      where: { id: userId },
      data: { plan, planExpiresAt },
    });

    // Create invoice
    await prisma.invoice.create({
      data: {
        userId: user.id,
        amount,
        currency,
        plan,
        provider,
        status: 'paid',
        receiptUrl: receiptUrl || null,
      },
    });

    await emailService.sendRecurringPayment(
      user.email,
      user.name,
      plan,
      amount,
      currency,
      receiptUrl
    );
  }
}

export const paymentService = new PaymentService();

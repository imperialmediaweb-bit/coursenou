import User, { IUser } from '../models/User';
import Invoice from '../models/Invoice';
import Subscription from '../models/Subscription';
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
  }): Promise<IUser> {
    const { userId, plan, provider, providerId, amount, currency, receiptUrl } = params;

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Set plan and expiration
    user.plan = plan;
    const now = new Date();
    if (plan === 'monthly') {
      user.planExpiresAt = new Date(now.setMonth(now.getMonth() + 1));
    } else {
      user.planExpiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
    }

    // Save provider subscription ID
    switch (provider) {
      case 'stripe':
        user.stripeSubscriptionId = providerId;
        break;
      case 'paypal':
        user.paypalSubscriptionId = providerId;
        break;
      case 'razorpay':
        user.razorpaySubscriptionId = providerId;
        break;
      case 'paystack':
        user.paystackCustomerCode = providerId;
        break;
    }

    await user.save();

    // Create invoice
    await Invoice.create({
      userId: user._id,
      amount,
      currency,
      plan,
      provider,
      status: 'paid',
      receiptUrl: receiptUrl || null,
      providerInvoiceId: providerId,
    });

    // Create subscription record
    const startDate = new Date();
    const endDate = new Date(user.planExpiresAt!);
    await Subscription.findOneAndUpdate(
      { userId: user._id, provider },
      {
        userId: user._id,
        provider,
        planType: plan,
        status: 'active',
        startDate,
        endDate,
        providerId,
      },
      { upsert: true, new: true }
    );

    // Send confirmation email
    await emailService.sendSubscriptionConfirmation(
      user.email,
      user.name,
      plan,
      amount,
      currency,
      endDate
    );

    return user;
  }

  async cancelSubscription(userId: string, provider: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Update subscription record
    await Subscription.findOneAndUpdate(
      { userId: user._id, provider, status: 'active' },
      { status: 'cancelled' }
    );

    // User keeps access until planExpiresAt
    const expiresAt = user.planExpiresAt || new Date();

    await emailService.sendSubscriptionCancelled(
      user.email,
      user.name,
      expiresAt
    );
  }

  async handleExpiredSubscription(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      plan: 'free',
      planExpiresAt: null,
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

    const user = await User.findById(userId);
    if (!user) return;

    // Extend plan
    const now = new Date();
    user.plan = plan;
    if (plan === 'monthly') {
      user.planExpiresAt = new Date(now.setMonth(now.getMonth() + 1));
    } else {
      user.planExpiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
    }
    await user.save();

    // Create invoice
    await Invoice.create({
      userId: user._id,
      amount,
      currency,
      plan,
      provider,
      status: 'paid',
      receiptUrl: receiptUrl || null,
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

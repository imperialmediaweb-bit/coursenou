import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  provider: 'stripe' | 'paypal' | 'razorpay' | 'paystack';
  planType: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  startDate: Date;
  endDate: Date;
  providerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['stripe', 'paypal', 'razorpay', 'paystack'], required: true },
    planType: { type: String, enum: ['monthly', 'yearly'], required: true },
    status: { type: String, enum: ['active', 'cancelled', 'expired', 'past_due'], default: 'active' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    providerId: { type: String, required: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ providerId: 1 });

export default mongoose.model<ISubscription>('Subscription', subscriptionSchema);

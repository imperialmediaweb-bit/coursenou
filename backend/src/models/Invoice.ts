import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoice extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  plan: 'monthly' | 'yearly';
  provider: 'stripe' | 'paypal' | 'razorpay' | 'paystack';
  status: 'paid' | 'failed' | 'pending' | 'refunded';
  receiptUrl: string | null;
  providerInvoiceId: string | null;
  createdAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    plan: { type: String, enum: ['monthly', 'yearly'], required: true },
    provider: { type: String, enum: ['stripe', 'paypal', 'razorpay', 'paystack'], required: true },
    status: { type: String, enum: ['paid', 'failed', 'pending', 'refunded'], default: 'paid' },
    receiptUrl: { type: String, default: null },
    providerInvoiceId: { type: String, default: null },
  },
  { timestamps: true }
);

invoiceSchema.index({ userId: 1 });
invoiceSchema.index({ providerInvoiceId: 1 });

export default mongoose.model<IInvoice>('Invoice', invoiceSchema);

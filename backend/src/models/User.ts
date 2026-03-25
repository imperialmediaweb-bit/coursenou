import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  plan: 'free' | 'monthly' | 'yearly';
  planExpiresAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  paypalSubscriptionId: string | null;
  razorpaySubscriptionId: string | null;
  paystackCustomerCode: string | null;
  aiProvider: 'gemini' | 'openai' | 'claude';
  aiCreditsUsed: number;
  refreshToken: string | null;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    plan: { type: String, enum: ['free', 'monthly', 'yearly'], default: 'free' },
    planExpiresAt: { type: Date, default: null },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    paypalSubscriptionId: { type: String, default: null },
    razorpaySubscriptionId: { type: String, default: null },
    paystackCustomerCode: { type: String, default: null },
    aiProvider: { type: String, enum: ['gemini', 'openai', 'claude'], default: 'gemini' },
    aiCreditsUsed: { type: Number, default: 0 },
    refreshToken: { type: String, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ stripeCustomerId: 1 });
userSchema.index({ resetPasswordToken: 1 });

export default mongoose.model<IUser>('User', userSchema);

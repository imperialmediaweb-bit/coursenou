import mongoose, { Document, Schema } from 'mongoose';

export interface IContentPage extends Document {
  slug: 'terms' | 'privacy' | 'cancellation' | 'refund' | 'billing';
  content: string;
  updatedAt: Date;
}

const contentPageSchema = new Schema<IContentPage>(
  {
    slug: {
      type: String,
      enum: ['terms', 'privacy', 'cancellation', 'refund', 'billing'],
      required: true,
      unique: true,
    },
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IContentPage>('ContentPage', contentPageSchema);

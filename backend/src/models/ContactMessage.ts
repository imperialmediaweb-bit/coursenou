import mongoose, { Document, Schema } from 'mongoose';

export interface IContactMessage extends Document {
  name: string;
  email: string;
  message: string;
  replied: boolean;
  replyText: string | null;
  createdAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    replied: { type: Boolean, default: false },
    replyText: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IContactMessage>('ContactMessage', contactMessageSchema);

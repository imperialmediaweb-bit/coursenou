import mongoose, { Document, Schema } from 'mongoose';

export interface IRating extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  rating: number; // 1-5
  feedback: string;
  createdAt: Date;
}

const ratingSchema = new Schema<IRating>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, default: '' },
}, { timestamps: true });

ratingSchema.index({ userId: 1, courseId: 1 }, { unique: true });
ratingSchema.index({ courseId: 1 });
export default mongoose.model<IRating>('Rating', ratingSchema);

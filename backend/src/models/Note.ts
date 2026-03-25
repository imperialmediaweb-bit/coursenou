import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  content: string;
  updatedAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model<INote>('Note', noteSchema);

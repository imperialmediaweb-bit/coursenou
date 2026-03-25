import mongoose, { Document, Schema } from 'mongoose';

export interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  topicIndex: number;
  subtopicIndex: number;
  subtopicTitle: string;
  note: string;
  createdAt: Date;
}

const bookmarkSchema = new Schema<IBookmark>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  topicIndex: { type: Number, required: true },
  subtopicIndex: { type: Number, required: true },
  subtopicTitle: { type: String, required: true },
  note: { type: String, default: '' },
}, { timestamps: true });

bookmarkSchema.index({ userId: 1, courseId: 1 });
export default mongoose.model<IBookmark>('Bookmark', bookmarkSchema);

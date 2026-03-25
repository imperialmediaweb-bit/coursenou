import mongoose, { Document, Schema } from 'mongoose';

export interface IFlashcard extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  cards: { front: string; back: string; difficulty: 'easy' | 'medium' | 'hard'; lastReviewed: Date | null; nextReview: Date | null; correctCount: number; incorrectCount: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const flashcardSchema = new Schema<IFlashcard>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  cards: [{
    front: { type: String, required: true },
    back: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    lastReviewed: { type: Date, default: null },
    nextReview: { type: Date, default: null },
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
  }],
}, { timestamps: true, _id: true });

flashcardSchema.index({ userId: 1, courseId: 1 });
export default mongoose.model<IFlashcard>('Flashcard', flashcardSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface IQuiz extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  language: string;
  questions: IQuestion[];
  score: number | null;
  passed: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true },
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const quizSchema = new Schema<IQuiz>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    language: { type: String, required: true, default: 'English' },
    questions: [questionSchema],
    score: { type: Number, default: null },
    passed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

quizSchema.index({ userId: 1, courseId: 1 });

export default mongoose.model<IQuiz>('Quiz', quizSchema);

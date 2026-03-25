import mongoose, { Document, Schema } from 'mongoose';

export interface ICourseProgress extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  visitedSubtopics: string[]; // array of "topicIndex-subtopicIndex" strings
  percentage: number;
  lastVisitedTopic: number;
  lastVisitedSubtopic: number;
  totalTimeSpent: number; // seconds
  updatedAt: Date;
}

const courseProgressSchema = new Schema<ICourseProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  visitedSubtopics: [{ type: String }],
  percentage: { type: Number, default: 0 },
  lastVisitedTopic: { type: Number, default: 0 },
  lastVisitedSubtopic: { type: Number, default: 0 },
  totalTimeSpent: { type: Number, default: 0 },
}, { timestamps: true });

courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
export default mongoose.model<ICourseProgress>('CourseProgress', courseProgressSchema);

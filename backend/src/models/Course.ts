import mongoose, { Document, Schema } from 'mongoose';

export interface ISubtopic {
  title: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
}

export interface ITopic {
  title: string;
  subtopics: ISubtopic[];
}

export interface ICourse extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  language: string;
  type: 'image' | 'video';
  topics: ITopic[];
  audioUrl: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  shareToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const subtopicSchema = new Schema<ISubtopic>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    imageUrl: { type: String, default: null },
    videoUrl: { type: String, default: null },
  },
  { _id: false }
);

const topicSchema = new Schema<ITopic>(
  {
    title: { type: String, required: true },
    subtopics: [subtopicSchema],
  },
  { _id: false }
);

const courseSchema = new Schema<ICourse>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    language: { type: String, required: true, default: 'English' },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    topics: [topicSchema],
    audioUrl: { type: String, default: null },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    shareToken: { type: String, unique: true, required: true },
  },
  { timestamps: true }
);

courseSchema.index({ userId: 1 });
courseSchema.index({ shareToken: 1 });

export default mongoose.model<ICourse>('Course', courseSchema);

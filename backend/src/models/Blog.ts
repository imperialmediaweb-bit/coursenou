import mongoose, { Document, Schema } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  coverImage: string | null;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, required: true },
    coverImage: { type: String, default: null },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

blogSchema.index({ slug: 1 });
blogSchema.index({ published: 1, createdAt: -1 });

export default mongoose.model<IBlog>('Blog', blogSchema);

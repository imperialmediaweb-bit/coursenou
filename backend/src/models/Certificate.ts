import mongoose, { Document, Schema } from 'mongoose';

export interface ICertificate extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  courseName: string;
  userName: string;
  issuedAt: Date;
  downloadUrl: string;
}

const certificateSchema = new Schema<ICertificate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    courseName: { type: String, required: true },
    userName: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now },
    downloadUrl: { type: String, default: '' },
  },
  { timestamps: false }
);

certificateSchema.index({ userId: 1 });
certificateSchema.index({ courseId: 1 });

export default mongoose.model<ICertificate>('Certificate', certificateSchema);

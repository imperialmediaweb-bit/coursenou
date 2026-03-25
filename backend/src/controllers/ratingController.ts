import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Course from '../models/Course';
import Rating from '../models/Rating';

export const rateCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      res.status(200).json({ success: true, data: { rating: req.body.rating, feedback: req.body.feedback || '' } });
      return;
    }

    const user = req.user!;
    const { courseId } = req.params;
    const { rating, feedback } = req.body;

    if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new AppError('Rating must be an integer between 1 and 5', 400);
    }

    if (feedback !== undefined && typeof feedback !== 'string') {
      throw new AppError('Feedback must be a string', 400);
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    const ratingDoc = await Rating.findOneAndUpdate(
      { userId: user._id, courseId },
      {
        userId: user._id,
        courseId,
        rating,
        feedback: feedback || '',
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: ratingDoc });
  } catch (error) {
    next(error);
  }
};

export const getCourseRating = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      res.status(200).json({ success: true, data: { userRating: null, averageRating: 0, totalRatings: 0 } });
      return;
    }

    const user = req.user!;
    const { courseId } = req.params;

    // Get user's own rating
    const userRating = await Rating.findOne({ userId: user._id, courseId });

    // Aggregate average rating and total count
    const aggregate = await Rating.aggregate([
      { $match: { courseId: require('mongoose').Types.ObjectId.createFromHexString(courseId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
        },
      },
    ]);

    const averageRating = aggregate.length > 0 ? Math.round(aggregate[0].averageRating * 10) / 10 : 0;
    const totalRatings = aggregate.length > 0 ? aggregate[0].totalRatings : 0;

    res.status(200).json({
      success: true,
      data: {
        userRating: userRating || null,
        averageRating,
        totalRatings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCourseRatings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const { courseId } = req.params;

    const ratings = await Rating.find({ courseId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: ratings });
  } catch (error) {
    next(error);
  }
};

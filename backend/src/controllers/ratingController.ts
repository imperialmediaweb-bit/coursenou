import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';

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
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    const ratingDoc = await prisma.rating.upsert({
      where: {
        userId_courseId: { userId: user._id as string, courseId },
      },
      create: {
        userId: user._id as string,
        courseId,
        rating,
        feedback: feedback || '',
      },
      update: {
        rating,
        feedback: feedback || '',
      },
    });

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
    const userRating = await prisma.rating.findFirst({
      where: { userId: user._id as string, courseId },
    });

    // Aggregate average rating and total count
    const aggregate = await prisma.rating.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: true,
    });

    const averageRating = aggregate._avg.rating
      ? Math.round(aggregate._avg.rating * 10) / 10
      : 0;
    const totalRatings = aggregate._count;

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

    const ratings = await prisma.rating.findMany({
      where: { courseId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: ratings });
  } catch (error) {
    next(error);
  }
};

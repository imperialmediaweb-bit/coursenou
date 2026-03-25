import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Course from '../models/Course';
import CourseProgress from '../models/CourseProgress';

export const getProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      res.status(200).json({ success: true, data: { percentage: 0, visitedSubtopics: [], lastVisitedTopic: 0, lastVisitedSubtopic: 0, totalTimeSpent: 0 } });
      return;
    }

    const user = req.user!;

    const progress = await CourseProgress.findOne({
      userId: user._id,
      courseId: req.params.courseId,
    });

    if (!progress) {
      res.status(200).json({
        success: true,
        data: {
          percentage: 0,
          visitedSubtopics: [],
          lastVisitedTopic: 0,
          lastVisitedSubtopic: 0,
          totalTimeSpent: 0,
        },
      });
      return;
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

export const updateProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      res.status(200).json({ success: true, data: { percentage: 0, visitedSubtopics: req.body.visitedSubtopics || [] } });
      return;
    }

    const user = req.user!;
    const { courseId } = req.params;
    const { visitedSubtopics, lastVisitedTopic, lastVisitedSubtopic, timeSpent } = req.body;

    if (!Array.isArray(visitedSubtopics)) {
      throw new AppError('visitedSubtopics must be an array', 400);
    }

    if (typeof lastVisitedTopic !== 'number' || typeof lastVisitedSubtopic !== 'number') {
      throw new AppError('lastVisitedTopic and lastVisitedSubtopic must be numbers', 400);
    }

    if (typeof timeSpent !== 'number' || timeSpent < 0) {
      throw new AppError('timeSpent must be a non-negative number', 400);
    }

    // Find course to calculate total subtopics count
    const course = await Course.findById(courseId);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    let totalSubtopics = 0;
    for (const topic of course.topics) {
      totalSubtopics += topic.subtopics.length;
    }

    const percentage = totalSubtopics > 0
      ? Math.min(100, Math.round((visitedSubtopics.length / totalSubtopics) * 100))
      : 0;

    const progress = await CourseProgress.findOneAndUpdate(
      { userId: user._id, courseId },
      {
        $addToSet: { visitedSubtopics: { $each: visitedSubtopics } },
        $inc: { totalTimeSpent: timeSpent },
        $set: {
          percentage,
          lastVisitedTopic,
          lastVisitedSubtopic,
        },
      },
      { upsert: true, new: true }
    );

    // Recalculate percentage based on actual visitedSubtopics after $addToSet
    if (progress.visitedSubtopics.length !== visitedSubtopics.length) {
      const actualPercentage = totalSubtopics > 0
        ? Math.min(100, Math.round((progress.visitedSubtopics.length / totalSubtopics) * 100))
        : 0;
      progress.percentage = actualPercentage;
      await progress.save();
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

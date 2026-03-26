import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';

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

    const progress = await prisma.courseProgress.findFirst({
      where: {
        userId: user._id as string,
        courseId: req.params.courseId,
      },
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
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    let totalSubtopics = 0;
    for (const topic of course.topics as any[]) {
      totalSubtopics += topic.subtopics.length;
    }

    // Get existing progress to merge visitedSubtopics
    const existing = await prisma.courseProgress.findFirst({
      where: { userId: user._id as string, courseId },
    });

    // Merge visitedSubtopics (equivalent to $addToSet)
    const existingVisited = (existing?.visitedSubtopics as string[]) || [];
    const mergedVisited = [...new Set([...existingVisited, ...visitedSubtopics])];

    const percentage = totalSubtopics > 0
      ? Math.min(100, Math.round((mergedVisited.length / totalSubtopics) * 100))
      : 0;

    const newTotalTimeSpent = (existing?.totalTimeSpent || 0) + timeSpent;

    const progress = await prisma.courseProgress.upsert({
      where: {
        userId_courseId: { userId: user._id as string, courseId },
      },
      create: {
        userId: user._id as string,
        courseId,
        visitedSubtopics: mergedVisited,
        percentage,
        lastVisitedTopic,
        lastVisitedSubtopic,
        totalTimeSpent: timeSpent,
      },
      update: {
        visitedSubtopics: mergedVisited,
        percentage,
        lastVisitedTopic,
        lastVisitedSubtopic,
        totalTimeSpent: newTotalTimeSpent,
      },
    });

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

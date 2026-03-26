import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
import { PLAN_LIMITS } from '../utils/planLimits';
import { getDemoCourse, storeDemoCourse } from '../utils/demoStore';

export const duplicateCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;

    if (String(user._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      const demoCourse = getDemoCourse(req.params.courseId);
      if (!demoCourse) {
        throw new AppError('Course not found', 404);
      }
      const newId = `demo-course-${Date.now()}`;
      const newCourse = {
        ...demoCourse,
        _id: newId,
        title: `${demoCourse.title} (Copy)`,
        shareToken: uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storeDemoCourse(newCourse);
      res.status(201).json({ success: true, data: newCourse });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId !== user._id) {
      throw new AppError('Not authorized to duplicate this course', 403);
    }

    // Check plan limits
    const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS];
    if (limits.maxCourses !== Infinity) {
      const courseCount = await prisma.course.count({ where: { userId: user._id as string } });
      if (courseCount >= limits.maxCourses) {
        throw new AppError(
          `Your ${user.plan} plan allows a maximum of ${limits.maxCourses} courses. Please upgrade for more.`,
          403
        );
      }
    }

    // Deep copy topics
    const topicsCopy = (course.topics as any[]).map((topic) => ({
      title: topic.title,
      subtopics: topic.subtopics.map((subtopic: any) => ({
        title: subtopic.title,
        content: subtopic.content,
        imageUrl: subtopic.imageUrl,
        videoUrl: subtopic.videoUrl,
      })),
    }));

    const newCourse = await prisma.course.create({
      data: {
        userId: user._id as string,
        title: `${course.title} (Copy)`,
        language: course.language,
        type: course.type,
        topics: topicsCopy as any,
        shareToken: uuidv4(),
      },
    });

    res.status(201).json({ success: true, data: newCourse });
  } catch (error) {
    next(error);
  }
};

import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Course from '../models/Course';
import { PLAN_LIMITS } from '../utils/planLimits';

export const duplicateCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;

    const course = await Course.findById(req.params.courseId);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId.toString() !== user._id.toString()) {
      throw new AppError('Not authorized to duplicate this course', 403);
    }

    // Check plan limits
    const limits = PLAN_LIMITS[user.plan];
    if (limits.maxCourses !== Infinity) {
      const courseCount = await Course.countDocuments({ userId: user._id });
      if (courseCount >= limits.maxCourses) {
        throw new AppError(
          `Your ${user.plan} plan allows a maximum of ${limits.maxCourses} courses. Please upgrade for more.`,
          403
        );
      }
    }

    // Deep copy topics
    const topicsCopy = course.topics.map((topic) => ({
      title: topic.title,
      subtopics: topic.subtopics.map((subtopic) => ({
        title: subtopic.title,
        content: subtopic.content,
        imageUrl: subtopic.imageUrl,
        videoUrl: subtopic.videoUrl,
      })),
    }));

    const newCourse = await Course.create({
      userId: user._id,
      title: `${course.title} (Copy)`,
      language: course.language,
      type: course.type,
      topics: topicsCopy,
      shareToken: uuidv4(),
    });

    res.status(201).json({ success: true, data: newCourse });
  } catch (error) {
    next(error);
  }
};

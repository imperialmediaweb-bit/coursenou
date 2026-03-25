import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { storeDemoCourse, getDemoCourse, getAllDemoCourses } from '../utils/demoStore';
import Course from '../models/Course';
import User from '../models/User';
import Certificate from '../models/Certificate';
import Quiz from '../models/Quiz';
import Note from '../models/Note';
import { aiService } from '../services/aiService';
import { imageService } from '../services/imageService';
import { exportService } from '../services/exportService';
import { certificateService } from '../services/certificateService';
import { emailService } from '../services/emailService';
import { PLAN_LIMITS } from '../utils/planLimits';

const generateTopicsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  language: z.string().min(1, 'Language is required'),
  numTopics: z.number().int().min(1).max(20),
  type: z.string().optional(),
}).passthrough();

const generateCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  language: z.string().min(1, 'Language is required'),
  type: z.enum(['image', 'video']),
  topics: z.array(
    z.object({
      title: z.string(),
      subtopics: z.array(z.string()),
    })
  ).min(1, 'At least one topic is required'),
});

export const generateTopics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = generateTopicsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    const { title, language, numTopics } = parsed.data;
    const user = req.user!;
    const limits = PLAN_LIMITS[user.plan];

    if (numTopics > limits.maxTopics) {
      throw new AppError(
        `Your ${user.plan} plan allows a maximum of ${limits.maxTopics} topics. Please upgrade for more.`,
        403
      );
    }

    const topics = await aiService.generateTopics(user.aiProvider, title, language, numTopics);

    if (String(user._id) !== 'demo-user-id-001') {
      user.aiCreditsUsed += 1;
      await user.save();
    }

    res.status(200).json({ success: true, data: topics });
  } catch (error) {
    next(error);
  }
};

export const generateCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = generateCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }

    const { title, language, type, topics } = parsed.data;
    const user = req.user!;
    const limits = PLAN_LIMITS[user.plan];

    if (type === 'video' && !limits.allowVideo) {
      throw new AppError(
        'Video courses are not available on the free plan. Please upgrade.',
        403
      );
    }

    if (limits.maxCourses !== Infinity && String(user._id) !== 'demo-user-id-001') {
      const courseCount = await Course.countDocuments({ userId: user._id });
      if (courseCount >= limits.maxCourses) {
        throw new AppError(
          `Your ${user.plan} plan allows a maximum of ${limits.maxCourses} courses. Please upgrade for more.`,
          403
        );
      }
    }

    const courseContent = await aiService.generateCourse(user.aiProvider, topics, type, language);

    // Fetch images for each subtopic
    const topicsWithImages = await Promise.all(
      courseContent.map(async (topic) => ({
        title: topic.title,
        subtopics: await Promise.all(
          topic.subtopics.map(async (subtopic) => ({
            title: subtopic.title,
            content: subtopic.content,
            imageUrl: await imageService.searchImage(subtopic.imageSearchTerm),
            videoUrl: null,
          }))
        ),
      }))
    );

    // Demo user — return course object without saving to DB
    if (String(user._id) === 'demo-user-id-001') {
      const demoCourse = {
        _id: 'demo-course-' + Date.now(),
        userId: user._id,
        title,
        language,
        type,
        topics: topicsWithImages,
        shareToken: uuidv4(),
        isCompleted: false,
        completedAt: null,
        audioUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      storeDemoCourse(demoCourse);
      res.status(201).json({ success: true, data: demoCourse });
      return;
    }

    const course = await Course.create({
      userId: user._id,
      title,
      language,
      type,
      topics: topicsWithImages,
      shareToken: uuidv4(),
    });

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

export const getCourses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Demo user — return from memory store
    if (String(req.user!._id) === 'demo-user-id-001') {
      const demoCourses = getAllDemoCourses('demo-user-id-001');
      res.status(200).json({ success: true, data: demoCourses });
      return;
    }
    const courses = await Course.find({ userId: req.user!._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

export const getCourseById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check demo store first
    const demoCourse = getDemoCourse(req.params.id);
    if (demoCourse) {
      res.status(200).json({ success: true, data: demoCourse });
      return;
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized to access this course', 403);
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized to delete this course', 403);
    }

    await Quiz.deleteMany({ courseId: course._id });
    await Note.deleteMany({ courseId: course._id });
    await Course.findByIdAndDelete(course._id);

    res.status(200).json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const completeCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized to complete this course', 403);
    }

    const user = req.user!;

    course.isCompleted = true;
    course.completedAt = new Date();
    await course.save();

    const certificate = await Certificate.create({
      userId: user._id,
      courseId: course._id,
      courseName: course.title,
      userName: user.name,
      issuedAt: new Date(),
    });

    // Send certificate email (non-blocking)
    emailService
      .sendCertificateEarned(user.email, user.name, course.title, certificate._id.toString())
      .catch(() => {});

    res.status(200).json({ success: true, data: certificate });
  } catch (error) {
    next(error);
  }
};

export const getSharedCourse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const course = await Course.findOne({ shareToken: req.params.shareToken });
    if (!course) {
      throw new AppError('Shared course not found', 404);
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

export const generateAudio = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const limits = PLAN_LIMITS[user.plan];

    if (!limits.allowAudio) {
      throw new AppError(
        'Audio generation is not available on the free plan. Please upgrade.',
        403
      );
    }

    res.status(200).json({
      success: true,
      message: 'Audio generation is handled client-side using the Web Speech API.',
    });
  } catch (error) {
    next(error);
  }
};

export const exportPDF = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized to export this course', 403);
    }

    const pdfBuffer = await exportService.generatePDF(course);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(course.title)}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const exportPPT = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const limits = PLAN_LIMITS[user.plan];

    if (!limits.allowPptExport) {
      throw new AppError(
        'PowerPoint export is not available on the free plan. Please upgrade.',
        403
      );
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized to export this course', 403);
    }

    const pptBuffer = await exportService.generatePPT(course);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(course.title)}.pptx"`
    );
    res.send(pptBuffer);
  } catch (error) {
    next(error);
  }
};

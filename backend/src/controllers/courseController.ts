import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { storeDemoCourse, getDemoCourse, getAllDemoCourses } from '../utils/demoStore';
import prisma from '../utils/prisma';
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
    const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS];

    if (numTopics > limits.maxTopics) {
      throw new AppError(
        `Your ${user.plan} plan allows a maximum of ${limits.maxTopics} topics. Please upgrade for more.`,
        403
      );
    }

    const topics = await aiService.generateTopics(user.aiProvider, title, language, numTopics);

    if (String(user._id) !== 'demo-user-id-001') {
      if (typeof user.save === "function") {
        user.aiCreditsUsed += 1;
        await user.save();
      } else {
        await prisma.user.update({
          where: { id: user._id },
          data: { aiCreditsUsed: { increment: 1 } },
        });
      }
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
    const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS];

    if (type === 'video' && !limits.allowVideo) {
      throw new AppError(
        'Video courses are not available on the free plan. Please upgrade.',
        403
      );
    }

    if (limits.maxCourses !== Infinity && String(user._id) !== 'demo-user-id-001') {
      const courseCount = await prisma.course.count({ where: { userId: user._id } });
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

    const course = await prisma.course.create({
      data: {
        userId: user._id,
        title,
        language,
        type,
        topics: topicsWithImages,
        shareToken: uuidv4(),
      },
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
    const courses = await prisma.course.findMany({
      where: { userId: req.user!._id },
      orderBy: { createdAt: 'desc' },
    });
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

    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId !== req.user!._id.toString()) {
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
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId !== req.user!._id.toString()) {
      throw new AppError('Not authorized to delete this course', 403);
    }

    await prisma.quiz.deleteMany({ where: { courseId: course.id } });
    await prisma.note.deleteMany({ where: { courseId: course.id } });
    await prisma.course.delete({ where: { id: course.id } });

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
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId !== req.user!._id.toString()) {
      throw new AppError('Not authorized to complete this course', 403);
    }

    const user = req.user!;

    await prisma.course.update({
      where: { id: course.id },
      data: { isCompleted: true, completedAt: new Date() },
    });

    const certificate = await prisma.certificate.create({
      data: {
        userId: user._id,
        courseId: course.id,
        courseName: course.title,
        userName: user.name,
        issuedAt: new Date(),
      },
    });

    // Send certificate email (non-blocking)
    emailService
      .sendCertificateEarned(user.email, user.name, course.title, certificate.id.toString())
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
    const course = await prisma.course.findUnique({ where: { shareToken: req.params.shareToken } });
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
    const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS];

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
    // Get course from demo store or DB
    let course: any = getDemoCourse(req.params.id);
    if (!course) {
      course = await prisma.course.findUnique({ where: { id: req.params.id } });
    }
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Generate printable HTML page (browser can Ctrl+P to PDF)
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${course.title}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;line-height:1.7;max-width:800px;margin:0 auto;padding:40px 20px}
h1{color:#4f46e5;font-size:32px;border-bottom:3px solid #4f46e5;padding-bottom:12px}
h2{color:#6366f1;font-size:22px;margin-top:40px;border-left:4px solid #6366f1;padding-left:12px}
h3{color:#374151;font-size:17px;margin-top:24px}
p{margin:8px 0}
img{max-width:100%;border-radius:8px;margin:12px 0}
.cover{text-align:center;padding:80px 0}
@media print{.no-print{display:none}}
</style></head><body>
<div class="no-print" style="background:#4f46e5;color:white;padding:12px 20px;border-radius:8px;margin-bottom:32px;text-align:center">
Press <b>Ctrl+P</b> (or Cmd+P on Mac) to save as PDF
</div>
<div class="cover"><h1>${course.title}</h1><p>Language: ${course.language} | Generated by Coursbit</p></div>
${course.topics.map((t: any, i: number) => `
<h2>${i + 1}. ${t.title}</h2>
${t.subtopics.map((s: any) => `
<h3>${s.title}</h3>
${s.imageUrl ? `<img src="${s.imageUrl}" alt="${s.title}"/>` : ''}
${s.content.split('\n').map((p: string) => `<p>${p}</p>`).join('')}
`).join('')}
`).join('')}
<hr><p style="text-align:center;color:#9ca3af;font-size:12px">Generated by Coursbit — AI Course Generator</p>
</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
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
    const limits = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS];

    if (!limits.allowPptExport) {
      throw new AppError('PowerPoint export requires a paid plan.', 403);
    }

    let course: any = getDemoCourse(req.params.id);
    if (!course) {
      course = await prisma.course.findUnique({ where: { id: req.params.id } });
    }
    if (!course) {
      throw new AppError('Course not found', 404);
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

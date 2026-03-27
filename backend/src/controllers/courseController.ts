import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { storeDemoCourse, getDemoCourse, getAllDemoCourses, deleteDemoCourse } from '../utils/demoStore';
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

    if (String(user._id || user.id) !== 'demo-user-id-001') {
      try {
        await prisma.user.update({
          where: { id: String(user._id || user.id) },
          data: { aiCreditsUsed: { increment: 1 } },
        });
      } catch {}
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

    if (limits.maxCourses !== Infinity && String(user._id || user.id) !== 'demo-user-id-001') {
      const courseCount = await prisma.course.count({ where: { userId: String(user._id || user.id) } });
      if (courseCount >= limits.maxCourses) {
        throw new AppError(
          `Your ${user.plan} plan allows a maximum of ${limits.maxCourses} courses. Please upgrade for more.`,
          403
        );
      }
    }

    let courseContent;
    try {
      courseContent = await aiService.generateCourse(user.aiProvider, topics, type, language);
    } catch (aiError: any) {
      console.error('Course generation failed:', aiError.message);
      throw new AppError('Failed to generate course content. Please try again.', 500);
    }

    // Fetch images for each subtopic — include course title for relevance
    const topicsWithImages = await Promise.all(
      courseContent.map(async (topic) => ({
        title: topic.title,
        subtopics: await Promise.all(
          topic.subtopics.map(async (subtopic) => {
            let imageUrl = null;
            try {
              imageUrl = await imageService.searchImage(`${title} ${subtopic.title}`);
            } catch {
              // Image fetch failed, continue without image
            }
            return {
              title: subtopic.title,
              content: subtopic.content,
              imageUrl,
              videoUrl: null,
            };
          })
        ),
      }))
    );

    // Demo user — return course object without saving to DB
    if (String(user._id || user.id) === 'demo-user-id-001') {
      const demoCourse = {
        _id: 'demo-course-' + Date.now(),
        userId: String(user._id || user.id),
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
        userId: String(user._id || user.id),
        title,
        language,
        type,
        topics: JSON.parse(JSON.stringify(topicsWithImages)),
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
    const courseId = req.params.id;

    // Demo course — delete from memory store
    if (courseId.startsWith('demo-')) {
      deleteDemoCourse(courseId);
      res.status(200).json({ success: true, message: 'Course deleted successfully' });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId !== String(req.user!._id || (req.user as any).id)) {
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
        userId: String(user._id || user.id),
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

    // Generate dark-themed printable HTML page
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${course.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#0F1117;color:#B4B8CC;line-height:1.8;max-width:900px;margin:0 auto;padding:40px 24px}
h1{color:#F0F0FF;font-size:36px;font-weight:800;margin-bottom:8px}
h2{color:#F0F0FF;font-size:24px;font-weight:700;margin-top:48px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #262A36}
h3{color:#F0F0FF;font-size:18px;font-weight:600;margin-top:32px;margin-bottom:12px}
p{margin:12px 0;font-size:15px}
strong{color:#F0F0FF}
img{max-width:100%;border-radius:12px;margin:16px 0;border:1px solid #262A36}
.cover{text-align:center;padding:80px 0;border-bottom:1px solid #262A36;margin-bottom:40px}
.cover h1{font-size:42px;background:linear-gradient(135deg,#6C47FF,#8B6FFF);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cover .sub{color:#5C6078;font-size:14px;margin-top:8px}
.topic{margin-top:48px;padding-top:24px;border-top:1px solid #262A36}
.badge{display:inline-block;background:#6C47FF;color:#fff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:12px;letter-spacing:0.5px;text-transform:uppercase}
.print-bar{background:linear-gradient(135deg,#6C47FF,#8B6FFF);color:white;padding:14px 24px;border-radius:12px;margin-bottom:40px;text-align:center;font-weight:600;font-size:14px}
.footer{text-align:center;color:#5C6078;font-size:12px;margin-top:60px;padding-top:24px;border-top:1px solid #262A36}
@media print{.print-bar{display:none}body{background:#fff;color:#333}h1,h2,h3,strong{color:#111}.cover h1{-webkit-text-fill-color:#4f46e5;color:#4f46e5}p{color:#444}.topic{border-color:#eee}.cover{border-color:#eee}h2{border-color:#eee}}
</style></head><body>
<div class="print-bar">Press <b>Ctrl+P</b> (or Cmd+P) to save as PDF</div>
<div class="cover">
<h1>${course.title}</h1>
<div class="sub">${course.language} &middot; ${(course.topics as any[]).length} topics &middot; Generated by Coursbit</div>
</div>
${(course.topics as any[]).map((t: any, i: number) => `
<div class="topic">
<span class="badge">Topic ${i + 1}</span>
<h2>${t.title}</h2>
${t.subtopics.map((s: any) => `
<h3>${s.title}</h3>
${s.imageUrl ? `<img src="${s.imageUrl}" alt="${s.title}" loading="lazy"/>` : ''}
${s.content.split('\n').map((p: string) => `<p>${p}</p>`).join('')}
`).join('')}
</div>
`).join('')}
<div class="footer">Generated by Coursbit &mdash; AI Course Generator &middot; coursbit.com</div>
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

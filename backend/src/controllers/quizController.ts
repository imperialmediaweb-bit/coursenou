import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
import { aiService } from '../services/aiService';
import { getDemoCourse } from '../utils/demoStore';
import { notificationService } from '../services/notificationService';
import { getAiProvider } from '../services/settingsService';

export const generateQuiz = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      throw new AppError('Course ID is required', 400);
    }

    if (String(req.user!._id) === 'demo-user-id-001' || courseId.startsWith('demo-')) {
      const demoCourse = getDemoCourse(courseId);
      let courseContent = '';
      if (demoCourse) {
        courseContent = demoCourse.topics
          .map((topic: any) =>
            topic.subtopics.map((subtopic: any) => subtopic.content).join('\n')
          )
          .join('\n');
      } else {
        courseContent = 'General knowledge course content for demo purposes.';
      }
      const questions = await aiService.generateQuiz(
        await getAiProvider(),
        courseContent,
        demoCourse?.language || 'English',
        10
      );
      req.user!.aiCreditsUsed += 1;
      if (String(req.user!._id || req.user!._id) !== 'demo-user-id-001') {
        await prisma.user.update({ where: { id: String(req.user!._id) }, data: { aiCreditsUsed: req.user!.aiCreditsUsed } });
      }
      res.status(200).json({ success: true, data: { questions, courseId, score: null, passed: false } });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId !== req.user!._id) {
      throw new AppError('Not authorized to access this course', 403);
    }

    // Build course content string from all topics/subtopics
    const courseContent = (course.topics as any[])
      .map((topic) =>
        topic.subtopics.map((subtopic: any) => subtopic.content).join('\n')
      )
      .join('\n');

    const questions = await aiService.generateQuiz(
      await getAiProvider(),
      courseContent,
      course.language,
      10
    );

    const quiz = await prisma.quiz.upsert({
      where: {
        userId_courseId: { userId: req.user!._id as string, courseId: course.id },
      },
      create: {
        userId: req.user!._id as string,
        courseId: course.id,
        language: course.language,
        questions: questions as any,
        score: null,
        passed: false,
        completedAt: null,
      },
      update: {
        language: course.language,
        questions: questions as any,
        score: null,
        passed: false,
        completedAt: null,
      },
    });

    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

export const getQuiz = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      res.status(200).json({ success: true, data: null });
      return;
    }

    const quiz = await prisma.quiz.findFirst({
      where: {
        courseId: req.params.courseId,
        userId: req.user!._id as string,
      },
    });

    if (!quiz) {
      throw new AppError('Quiz not found', 404);
    }

    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    next(error);
  }
};

export const submitQuiz = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      res.status(200).json({ success: true, data: { score: 80, passed: true } });
      return;
    }

    const quiz = await prisma.quiz.findFirst({
      where: {
        courseId: req.params.courseId,
        userId: req.user!._id as string,
      },
    });

    if (!quiz) {
      throw new AppError('Quiz not found', 404);
    }

    const { answers } = req.body;
    if (!Array.isArray(answers) || !answers.every((a: any) => typeof a === 'number')) {
      throw new AppError('Answers must be an array of numbers', 400);
    }

    const questions = quiz.questions as any[];
    let correct = 0;
    questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correct++;
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= 70;
    const completedAt = new Date();

    await prisma.quiz.update({
      where: { id: quiz.id },
      data: { score, passed, completedAt },
    });

    if (passed) {
      notificationService
        .quizPassed(String(req.user!._id), quiz.courseId, correct, questions.length)
        .catch(() => {});
    }

    res.status(200).json({
      success: true,
      data: {
        score,
        passed,
        correct,
        total: questions.length,
        completedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

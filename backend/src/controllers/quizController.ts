import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Course from '../models/Course';
import Quiz from '../models/Quiz';
import { aiService } from '../services/aiService';
import { getDemoCourse } from '../utils/demoStore';

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
        req.user!.aiProvider,
        courseContent,
        demoCourse?.language || 'English',
        10
      );
      req.user!.aiCreditsUsed += 1;
      if (typeof req.user!.save === "function") await req.user!.save();
      res.status(200).json({ success: true, data: { questions, courseId, score: null, passed: false } });
      return;
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId.toString() !== req.user!._id.toString()) {
      throw new AppError('Not authorized to access this course', 403);
    }

    // Build course content string from all topics/subtopics
    const courseContent = course.topics
      .map((topic) =>
        topic.subtopics.map((subtopic) => subtopic.content).join('\n')
      )
      .join('\n');

    const questions = await aiService.generateQuiz(
      req.user!.aiProvider,
      courseContent,
      course.language,
      10
    );

    const quiz = await Quiz.findOneAndUpdate(
      { userId: req.user!._id, courseId: course._id },
      {
        userId: req.user!._id,
        courseId: course._id,
        language: course.language,
        questions,
        score: null,
        passed: false,
        completedAt: null,
      },
      { upsert: true, new: true }
    );

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

    const quiz = await Quiz.findOne({
      courseId: req.params.courseId,
      userId: req.user!._id,
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

    const quiz = await Quiz.findOne({
      courseId: req.params.courseId,
      userId: req.user!._id,
    });

    if (!quiz) {
      throw new AppError('Quiz not found', 404);
    }

    const { answers } = req.body;
    if (!Array.isArray(answers) || !answers.every((a: any) => typeof a === 'number')) {
      throw new AppError('Answers must be an array of numbers', 400);
    }

    let correct = 0;
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correct++;
      }
    });

    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = score >= 70;

    quiz.score = score;
    quiz.passed = passed;
    quiz.completedAt = new Date();
    await quiz.save();

    res.status(200).json({
      success: true,
      data: {
        score,
        passed,
        correct,
        total: quiz.questions.length,
        completedAt: quiz.completedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

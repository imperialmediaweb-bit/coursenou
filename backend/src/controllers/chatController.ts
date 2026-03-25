import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Course from '../models/Course';
import { aiService } from '../services/aiService';
import { getDemoCourse } from '../utils/demoStore';

export const chat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new AppError('Message is required and must be a non-empty string', 400);
    }

    if (String(user._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      const demoCourse = getDemoCourse(req.params.courseId);
      let context = '';
      if (demoCourse) {
        for (const topic of demoCourse.topics) {
          context += `Topic: ${topic.title}\n`;
          for (const subtopic of topic.subtopics) {
            context += `  ${subtopic.title}: ${subtopic.content}\n`;
          }
        }
        context = context.substring(0, 6000);
      } else {
        context = 'This is a demo course. Provide helpful responses about general learning topics.';
      }
      const response = await aiService.chatResponse(user.aiProvider, message.trim(), context);
      user.aiCreditsUsed += 1;
      await user.save();
      res.status(200).json({ success: true, data: { response } });
      return;
    }

    const course = await Course.findById(req.params.courseId);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId.toString() !== user._id.toString()) {
      throw new AppError('Not authorized to access this course', 403);
    }

    // Build context string from course topics/subtopics content
    let context = '';
    for (const topic of course.topics) {
      context += `Topic: ${topic.title}\n`;
      for (const subtopic of topic.subtopics) {
        context += `  ${subtopic.title}: ${subtopic.content}\n`;
      }
    }
    context = context.substring(0, 6000);

    const response = await aiService.chatResponse(user.aiProvider, message.trim(), context);

    user.aiCreditsUsed += 1;
    await user.save();

    res.status(200).json({ success: true, data: { response } });
  } catch (error) {
    next(error);
  }
};

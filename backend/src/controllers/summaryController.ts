import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Course from '../models/Course';
import { aiService } from '../services/aiService';
import { getDemoCourse } from '../utils/demoStore';

export const generateSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;

    if (String(user._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      const demoCourse = getDemoCourse(req.params.courseId);
      let content = '';
      if (demoCourse) {
        for (const topic of demoCourse.topics) {
          content += `Topic: ${topic.title}\n`;
          for (const subtopic of topic.subtopics) {
            content += `${subtopic.title}: ${subtopic.content}\n`;
          }
        }
      }
      if (content) {
        const prompt = `Create a concise executive summary (200-300 words) of the following course content. Include key takeaways and main concepts covered. Language: ${demoCourse.language}. Content: ${content.substring(0, 8000)}`;
        const summary = await aiService.chatResponse(user.aiProvider, prompt, '');
        user.aiCreditsUsed += 1;
        if (typeof user.save === "function") await user.save();
        res.status(200).json({ success: true, data: { summary } });
      } else {
        res.status(200).json({ success: true, data: { summary: 'This is a demo course summary. The course covers various topics designed to showcase the platform features.' } });
      }
      return;
    }

    const course = await Course.findById(req.params.courseId);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.userId.toString() !== user._id.toString()) {
      throw new AppError('Not authorized to access this course', 403);
    }

    // Build content from all subtopics
    let content = '';
    for (const topic of course.topics) {
      content += `Topic: ${topic.title}\n`;
      for (const subtopic of topic.subtopics) {
        content += `${subtopic.title}: ${subtopic.content}\n`;
      }
    }

    const prompt = `Create a concise executive summary (200-300 words) of the following course content. Include key takeaways and main concepts covered. Language: ${course.language}. Content: ${content.substring(0, 8000)}`;

    const summary = await aiService.chatResponse(user.aiProvider, prompt, '');

    user.aiCreditsUsed += 1;
    if (typeof user.save === "function") await user.save();

    res.status(200).json({ success: true, data: { summary } });
  } catch (error) {
    next(error);
  }
};

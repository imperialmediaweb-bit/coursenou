import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Course from '../models/Course';
import Flashcard from '../models/Flashcard';
import { aiService } from '../services/aiService';
import { getDemoCourse } from '../utils/demoStore';

// In-memory flashcard store for demo users
const demoFlashcards = new Map<string, any>();

export const generateFlashcards = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const courseId = req.params.courseId;
    const isDemoUser = String(user._id) === 'demo-user-id-001';
    const isDemoCourse = courseId.startsWith('demo-');

    // Get course content
    let courseContent = '';
    if (isDemoCourse) {
      const demoCourse = getDemoCourse(courseId);
      if (demoCourse) {
        for (const topic of demoCourse.topics) {
          for (const subtopic of topic.subtopics) {
            courseContent += `${subtopic.title}: ${subtopic.content}\n`;
          }
        }
      }
    } else {
      const course = await Course.findById(courseId);
      if (!course) throw new AppError('Course not found', 404);
      if (course.userId.toString() !== user._id.toString()) throw new AppError('Not authorized', 403);
      for (const topic of course.topics) {
        for (const subtopic of topic.subtopics) {
          courseContent += `${subtopic.title}: ${subtopic.content}\n`;
        }
      }
    }

    if (!courseContent) courseContent = 'General educational course content about learning and knowledge.';

    const prompt = `Based on the following course content, generate 15-20 flashcards for spaced repetition learning. Each flashcard should have a 'front' (question/term) and 'back' (answer/definition). Return ONLY valid JSON: [{ "front": "...", "back": "..."}]. Content: ${courseContent.substring(0, 8000)}`;

    const result = await aiService.chatResponse(user.aiProvider, prompt, '');

    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    const cleanText = jsonMatch ? jsonMatch[1].trim() : result.trim();
    const parsedCards: { front: string; back: string }[] = JSON.parse(cleanText);

    const cards = parsedCards.map((card) => ({
      front: card.front,
      back: card.back,
      difficulty: 'medium' as const,
      lastReviewed: null,
      nextReview: null,
      correctCount: 0,
      incorrectCount: 0,
    }));

    if (isDemoUser || isDemoCourse) {
      const flashcard = { _id: `demo-flashcard-${courseId}`, userId: user._id, courseId, cards, createdAt: new Date() };
      demoFlashcards.set(courseId, flashcard);
      res.status(200).json({ success: true, data: flashcard });
      return;
    }

    const flashcard = await Flashcard.findOneAndUpdate(
      { userId: user._id, courseId },
      { userId: user._id, courseId, cards },
      { upsert: true, new: true }
    );

    user.aiCreditsUsed += 1;
    await user.save();

    res.status(200).json({ success: true, data: flashcard });
  } catch (error) {
    next(error);
  }
};

export const getFlashcards = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const courseId = req.params.courseId;

    // Check demo store first
    const demoFlashcard = demoFlashcards.get(courseId);
    if (demoFlashcard) {
      res.status(200).json({ success: true, data: demoFlashcard });
      return;
    }

    if (String(req.user!._id) === 'demo-user-id-001' || courseId.startsWith('demo-')) {
      res.status(200).json({ success: true, data: null });
      return;
    }

    const flashcard = await Flashcard.findOne({
      userId: req.user!._id,
      courseId,
    });

    if (!flashcard) {
      res.status(200).json({ success: true, data: null });
      return;
    }

    res.status(200).json({ success: true, data: flashcard });
  } catch (error) {
    next(error);
  }
};

export const updateCard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { courseId, cardIndex } = req.params;
    const { difficulty, correct } = req.body;
    const index = parseInt(cardIndex, 10);

    // Demo flashcard update
    const demoFlashcard = demoFlashcards.get(courseId);
    if (demoFlashcard) {
      if (index >= 0 && index < demoFlashcard.cards.length) {
        const card = demoFlashcard.cards[index];
        if (difficulty) card.difficulty = difficulty;
        card.lastReviewed = new Date();
        const now = new Date();
        card.nextReview = new Date(now.getTime() + (difficulty === 'easy' ? 7 : difficulty === 'medium' ? 3 : 1) * 86400000);
        if (typeof correct === 'boolean') {
          if (correct) card.correctCount += 1;
          else card.incorrectCount += 1;
        }
      }
      res.status(200).json({ success: true, data: demoFlashcard });
      return;
    }

    if (String(req.user!._id) === 'demo-user-id-001') {
      res.status(200).json({ success: true, data: null });
      return;
    }

    const flashcard = await Flashcard.findOne({ userId: req.user!._id, courseId });
    if (!flashcard) throw new AppError('Flashcards not found', 404);

    if (isNaN(index) || index < 0 || index >= flashcard.cards.length) {
      throw new AppError('Invalid card index', 400);
    }

    const card = flashcard.cards[index];
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) card.difficulty = difficulty;
    card.lastReviewed = new Date();
    const now = new Date();
    card.nextReview = new Date(now.getTime() + (card.difficulty === 'easy' ? 7 : card.difficulty === 'medium' ? 3 : 1) * 86400000);
    if (typeof correct === 'boolean') {
      if (correct) card.correctCount += 1;
      else card.incorrectCount += 1;
    }
    await flashcard.save();

    res.status(200).json({ success: true, data: flashcard });
  } catch (error) {
    next(error);
  }
};

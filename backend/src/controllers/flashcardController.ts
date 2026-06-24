import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
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
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new AppError('Course not found', 404);
      if (course.userId !== user._id) throw new AppError('Not authorized', 403);
      for (const topic of course.topics as any[]) {
        for (const subtopic of topic.subtopics) {
          courseContent += `${subtopic.title}: ${subtopic.content}\n`;
        }
      }
    }

    if (!courseContent) courseContent = 'General educational course content about learning and knowledge.';

    let cards;
    try {
      const prompt = `Based on the following course content, generate 10 flashcards for spaced repetition learning. Each flashcard should have a 'front' (question/term) and 'back' (answer/definition). Return ONLY valid JSON array: [{"front":"...","back":"..."}]. Content: ${courseContent.substring(0, 6000)}`;

      const result = await aiService.chatResponse(user.aiProvider, prompt, '');

      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      const cleanText = jsonMatch ? jsonMatch[1].trim() : result.trim();
      // Try to find JSON array in response
      const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
      const parsedCards: { front: string; back: string }[] = JSON.parse(arrayMatch ? arrayMatch[0] : cleanText);

      cards = parsedCards.map((card) => ({
        front: card.front || 'Question',
        back: card.back || 'Answer',
        difficulty: 'medium' as const,
        lastReviewed: null,
        nextReview: null,
        correctCount: 0,
        incorrectCount: 0,
      }));
    } catch (parseError: any) {
      console.error('Flashcard parse error:', parseError.message);
      // Fallback: generate static flashcards from content
      const lines = courseContent.split('\n').filter(l => l.trim().length > 20).slice(0, 8);
      cards = lines.map((line, i) => ({
        front: `What is discussed in section ${i + 1}?`,
        back: line.substring(0, 200).trim(),
        difficulty: 'medium' as const,
        lastReviewed: null,
        nextReview: null,
        correctCount: 0,
        incorrectCount: 0,
      }));
      if (cards.length === 0) {
        cards = [
          { front: 'What is the main topic?', back: 'The core subject covered in this course.', difficulty: 'medium' as const, lastReviewed: null, nextReview: null, correctCount: 0, incorrectCount: 0 },
          { front: 'Name a key concept', back: 'One of the fundamental ideas explored in the lessons.', difficulty: 'medium' as const, lastReviewed: null, nextReview: null, correctCount: 0, incorrectCount: 0 },
        ];
      }
    }

    if (isDemoUser || isDemoCourse) {
      const flashcard = { _id: `demo-flashcard-${courseId}`, userId: user._id, courseId, cards, createdAt: new Date() };
      demoFlashcards.set(courseId, flashcard);
      res.status(200).json({ success: true, data: flashcard });
      return;
    }

    const flashcard = await prisma.flashcard.upsert({
      where: {
        userId_courseId: { userId: user._id as string, courseId },
      },
      create: {
        userId: user._id as string,
        courseId,
        cards: cards as any,
      },
      update: {
        cards: cards as any,
      },
    });

    if (String(user._id || user.id) !== 'demo-user-id-001') {
      await prisma.user.update({
        where: { id: String(user._id) },
        data: { aiCreditsUsed: user.aiCreditsUsed + 1 },
      });
    }

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

    const flashcard = await prisma.flashcard.findFirst({
      where: {
        userId: req.user!._id as string,
        courseId,
      },
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

    const flashcard = await prisma.flashcard.findFirst({ where: { userId: req.user!._id as string, courseId } });
    if (!flashcard) throw new AppError('Flashcards not found', 404);

    if (isNaN(index) || index < 0 || index >= (flashcard.cards as any[]).length) {
      throw new AppError('Invalid card index', 400);
    }

    const cards = flashcard.cards as any[];
    const card = cards[index];
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) card.difficulty = difficulty;
    card.lastReviewed = new Date();
    const now = new Date();
    card.nextReview = new Date(now.getTime() + (card.difficulty === 'easy' ? 7 : card.difficulty === 'medium' ? 3 : 1) * 86400000);
    if (typeof correct === 'boolean') {
      if (correct) card.correctCount += 1;
      else card.incorrectCount += 1;
    }

    const updated = await prisma.flashcard.update({
      where: { id: flashcard.id },
      data: { cards: cards as any },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

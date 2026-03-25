import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import Course from '../models/Course';
import Flashcard from '../models/Flashcard';
import { aiService } from '../services/aiService';

export const generateFlashcards = async (
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
      throw new AppError('Not authorized to access this course', 403);
    }

    // Build content string from all subtopics
    let courseContent = '';
    for (const topic of course.topics) {
      for (const subtopic of topic.subtopics) {
        courseContent += `${subtopic.title}: ${subtopic.content}\n`;
      }
    }

    const prompt = `Based on the following course content, generate 15-20 flashcards for spaced repetition learning. Each flashcard should have a 'front' (question/term) and 'back' (answer/definition). Return ONLY valid JSON: [{ "front": "...", "back": "..."}]. Content: ${courseContent.substring(0, 8000)}`;

    const result = await aiService.chatResponse(user.aiProvider, prompt, '');

    // Parse the AI response
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    const cleanText = jsonMatch ? jsonMatch[1].trim() : result.trim();
    const parsedCards: { front: string; back: string }[] = JSON.parse(cleanText);

    // Create cards with default difficulty
    const cards = parsedCards.map((card) => ({
      front: card.front,
      back: card.back,
      difficulty: 'medium' as const,
      lastReviewed: null,
      nextReview: null,
      correctCount: 0,
      incorrectCount: 0,
    }));

    const flashcard = await Flashcard.findOneAndUpdate(
      { userId: user._id, courseId: course._id },
      { userId: user._id, courseId: course._id, cards },
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
    const user = req.user!;

    const flashcard = await Flashcard.findOne({
      userId: user._id,
      courseId: req.params.courseId,
    });

    if (!flashcard) {
      throw new AppError('Flashcards not found for this course', 404);
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
    const user = req.user!;
    const { courseId, cardIndex } = req.params;
    const { difficulty, correct } = req.body;

    const flashcard = await Flashcard.findOne({
      userId: user._id,
      courseId,
    });

    if (!flashcard) {
      throw new AppError('Flashcards not found for this course', 404);
    }

    const index = parseInt(cardIndex, 10);
    if (isNaN(index) || index < 0 || index >= flashcard.cards.length) {
      throw new AppError('Invalid card index', 400);
    }

    const card = flashcard.cards[index];

    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      card.difficulty = difficulty;
    }

    card.lastReviewed = new Date();

    // Calculate next review based on difficulty
    const now = new Date();
    switch (card.difficulty) {
      case 'easy':
        card.nextReview = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'medium':
        card.nextReview = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        break;
      case 'hard':
        card.nextReview = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
        break;
    }

    if (typeof correct === 'boolean') {
      if (correct) {
        card.correctCount += 1;
      } else {
        card.incorrectCount += 1;
      }
    }

    await flashcard.save();

    res.status(200).json({ success: true, data: flashcard });
  } catch (error) {
    next(error);
  }
};

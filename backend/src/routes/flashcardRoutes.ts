import { Router } from 'express';
import { generateFlashcards, getFlashcards, updateCard } from '../controllers/flashcardController';
import { authMiddleware } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();
router.post('/generate/:courseId', authMiddleware, aiLimiter, generateFlashcards);
router.get('/:courseId', authMiddleware, getFlashcards);
router.put('/:courseId/:cardIndex', authMiddleware, updateCard);
export default router;

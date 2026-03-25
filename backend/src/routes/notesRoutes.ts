import { Router } from 'express';
import { getNotes, saveNotes } from '../controllers/notesController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.get('/:courseId', getNotes);
router.put('/:courseId', saveNotes);
export default router;

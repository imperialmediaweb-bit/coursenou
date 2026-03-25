import { Router } from 'express';
import { addBookmark, getBookmarks, getUserBookmarks, removeBookmark } from '../controllers/bookmarkController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.get('/', authMiddleware, getUserBookmarks);
router.post('/', authMiddleware, addBookmark);
router.get('/:courseId', authMiddleware, getBookmarks);
router.delete('/:id', authMiddleware, removeBookmark);
export default router;

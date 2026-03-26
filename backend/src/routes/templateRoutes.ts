import { Router } from 'express';
import { getTemplates, getTemplate } from '../controllers/templateController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.get('/', authMiddleware, getTemplates);
router.get('/:id', authMiddleware, getTemplate);
export default router;

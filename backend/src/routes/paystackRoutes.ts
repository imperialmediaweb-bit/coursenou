import { Router } from 'express';
import { initialize, verify, webhook } from '../controllers/paystackController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.post('/initialize', authMiddleware, initialize);
router.get('/verify/:reference', authMiddleware, verify);
router.post('/webhook', webhook);
export default router;

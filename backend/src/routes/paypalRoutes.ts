import { Router } from 'express';
import { createSubscription, capture, webhook, cancelSubscription } from '../controllers/paypalController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.post('/create-subscription', authMiddleware, createSubscription);
router.post('/capture', authMiddleware, capture);
router.post('/webhook', webhook);
router.post('/cancel', authMiddleware, cancelSubscription);
export default router;

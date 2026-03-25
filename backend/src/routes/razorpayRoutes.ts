import { Router } from 'express';
import { createOrder, verify, webhook } from '../controllers/razorpayController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.post('/create-order', authMiddleware, createOrder);
router.post('/verify', authMiddleware, verify);
router.post('/webhook', webhook);
export default router;

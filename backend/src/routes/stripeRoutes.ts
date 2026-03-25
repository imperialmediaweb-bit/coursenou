import { Router } from 'express';
import express from 'express';
import { createCheckout, webhook, cancelSubscription } from '../controllers/stripeController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.post('/create-checkout', authMiddleware, createCheckout);
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);
router.post('/cancel', authMiddleware, cancelSubscription);
export default router;

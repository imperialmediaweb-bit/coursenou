import { Router } from 'express';
import { getPlans, getSubscription, getInvoices, downloadInvoice } from '../controllers/billingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.get('/plans', getPlans);
router.get('/subscription', getSubscription);
router.get('/invoices', getInvoices);
router.get('/invoices/:id/download', downloadInvoice);
export default router;

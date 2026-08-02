import { Router } from 'express';
import { getPlans, getSubscription, getInvoices, downloadInvoice, reconcile } from '../controllers/billingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.get('/plans', getPlans);
router.get('/subscription', getSubscription);
// Called on return from checkout, to recover a payment whose webhook was lost.
router.post('/reconcile', reconcile);
router.get('/invoices', getInvoices);
router.get('/invoices/:id/download', downloadInvoice);
export default router;

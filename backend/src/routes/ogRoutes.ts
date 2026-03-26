import { Router } from 'express';
import { generateOGImage } from '../controllers/ogController';

const router = Router();
router.get('/:id', generateOGImage);
export default router;

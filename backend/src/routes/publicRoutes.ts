import { Router } from 'express';
import { getPublishedBlogs, getBlogBySlug, getContentPage, submitContact } from '../controllers/publicController';

const router = Router();
router.get('/blogs', getPublishedBlogs);
router.get('/blogs/:slug', getBlogBySlug);
router.get('/content/:slug', getContentPage);
router.post('/contact', submitContact);
export default router;

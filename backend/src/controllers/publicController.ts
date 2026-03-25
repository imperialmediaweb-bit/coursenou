import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import Blog from '../models/Blog';
import ContentPage from '../models/ContentPage';
import ContactMessage from '../models/ContactMessage';

export const getPublishedBlogs = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const blogs = await Blog.find({ published: true }).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    next(error);
  }
};

export const getBlogBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const blog = await Blog.findOne({
      slug: req.params.slug,
      published: true,
    });
    if (!blog) {
      throw new AppError('Blog not found', 404);
    }
    res.json(blog);
  } catch (error) {
    next(error);
  }
};

export const getContentPage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = await ContentPage.findOne({ slug: req.params.slug });
    res.json(page);
  } catch (error) {
    next(error);
  }
};

export const submitContact = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      throw new AppError('Name, email, and message are required', 400);
    }

    await ContactMessage.create({ name, email, message });
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    next(error);
  }
};

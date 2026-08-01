import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
import { emailService } from '../services/emailService';

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(200),
  message: z
    .string()
    .trim()
    .min(10, 'Please write at least a few words')
    .max(5000, 'Message is too long (5000 characters maximum)'),
});

export const getPublishedBlogs = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const blogs = await prisma.blog.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    });
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
    const blog = await prisma.blog.findFirst({
      where: {
        slug: req.params.slug,
        published: true,
      },
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
    const page = await prisma.contentPage.findFirst({ where: { slug: req.params.slug } });
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
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }
    const { name, email, message } = parsed.data;

    const saved = await prisma.contactMessage.create({ data: { name, email, message } });

    // The message used to land in the database and nowhere else, so unless
    // the owner happened to open the admin panel they never knew about it.
    emailService.sendContactNotification(name, email, message, saved.id).catch(() => {});

    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    next(error);
  }
};

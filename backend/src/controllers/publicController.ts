import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';

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
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      throw new AppError('Name, email, and message are required', 400);
    }

    await prisma.contactMessage.create({ data: { name, email, message } });
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    next(error);
  }
};

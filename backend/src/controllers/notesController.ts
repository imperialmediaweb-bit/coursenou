import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';

export const getNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      res.status(200).json({ success: true, data: { content: '' } });
      return;
    }

    const note = await prisma.note.findFirst({
      where: {
        courseId: req.params.courseId,
        userId: req.user!._id as string,
      },
    });

    res.status(200).json({ success: true, data: note || { content: '' } });
  } catch (error) {
    next(error);
  }
};

export const saveNotes = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001' || req.params.courseId?.startsWith('demo-')) {
      res.status(200).json({ success: true, data: { content: req.body.content || '' } });
      return;
    }

    const { content } = req.body;
    if (typeof content !== 'string') {
      throw new AppError('Content must be a string', 400);
    }

    const note = await prisma.note.upsert({
      where: {
        userId_courseId: { userId: req.user!._id as string, courseId: req.params.courseId },
      },
      create: {
        userId: req.user!._id as string,
        courseId: req.params.courseId,
        content,
      },
      update: {
        content,
      },
    });

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

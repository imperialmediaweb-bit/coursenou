import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';
import { sanitizeUser } from '../utils/sanitizeUser';

export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json(req.user);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email } = req.body;

    if (!name && !email) {
      throw new AppError('Please provide name or email to update', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!._id as string } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (email && email !== user.email) {
      const existing = await prisma.user.findFirst({ where: { email } });
      if (existing) {
        throw new AppError('Email is already in use', 400);
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user!._id as string },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      },
    });

    res.json(sanitizeUser(updated));
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!._id as string } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user!._id as string },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

export const switchAiProvider = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { provider } = req.body;

    if (!provider || !['gemini', 'openai'].includes(provider)) {
      throw new AppError('Invalid AI provider. Must be gemini or openai', 400);
    }

    const updated = await prisma.user.update({
      where: { id: req.user!._id as string },
      data: { aiProvider: provider },
    });

    const { password: _, ...userWithoutPassword } = updated;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!._id as string;

    await Promise.all([
      prisma.course.deleteMany({ where: { userId } }),
      prisma.quiz.deleteMany({ where: { userId } }),
      prisma.note.deleteMany({ where: { userId } }),
      prisma.certificate.deleteMany({ where: { userId } }),
      prisma.invoice.deleteMany({ where: { userId } }),
      prisma.subscription.deleteMany({ where: { userId } }),
    ]);
    await prisma.user.delete({ where: { id: userId } });

    res.clearCookie('refreshToken');
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

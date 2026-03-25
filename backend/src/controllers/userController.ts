import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import User from '../models/User';
import Course from '../models/Course';
import Quiz from '../models/Quiz';
import Note from '../models/Note';
import Certificate from '../models/Certificate';
import Invoice from '../models/Invoice';
import Subscription from '../models/Subscription';

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

    const user = await User.findById(req.user!._id).select('-password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        throw new AppError('Email is already in use', 400);
      }
      user.email = email;
    }

    if (name) {
      user.name = name;
    }

    await user.save();
    res.json(user);
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

    const user = await User.findById(req.user!._id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

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

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { aiProvider: provider },
      { new: true }
    ).select('-password');

    res.json(user);
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
    const userId = req.user!._id;

    await Promise.all([
      Course.deleteMany({ userId }),
      Quiz.deleteMany({ userId }),
      Note.deleteMany({ userId }),
      Certificate.deleteMany({ userId }),
      Invoice.deleteMany({ userId }),
      Subscription.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    res.clearCookie('refreshToken');
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
};

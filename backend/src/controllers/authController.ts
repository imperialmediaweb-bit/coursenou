import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { emailService } from '../services/emailService';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    await emailService.sendWelcome(email, name);

    const userObj = user.toObject();
    const { password: _pw, ...userWithoutPassword } = userObj;

    res.status(201).json({ user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Demo account bypass — works without database
    if (email === 'demo@coursbit.com' && password === 'demo123456') {
      const demoUser = {
        _id: 'demo-user-id-001',
        name: 'Demo User',
        email: 'demo@coursbit.com',
        role: 'user' as const,
        plan: 'monthly' as const,
        planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        aiProvider: 'gemini' as const,
        aiCreditsUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const accessToken = jwt.sign(
        { userId: demoUser._id },
        process.env.JWT_SECRET || 'demo-jwt-secret-key-minimum-64-chars-for-security-purposes-here',
        { expiresIn: '24h' as any }
      );

      const refreshToken = jwt.sign(
        { userId: demoUser._id },
        process.env.JWT_REFRESH_SECRET || 'demo-refresh-secret-key-minimum-64-chars-for-security-here',
        { expiresIn: '30d' as any }
      );

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'strict' as const,
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({ accessToken, user: demoUser });
      return;
    }

    let user;
    try {
      user = await User.findOne({ email });
    } catch {
      throw new AppError('Database not available. Use demo account: demo@coursbit.com', 503);
    }
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'strict' as const,
      path: '/',
    });

    const userObj = user.toObject();
    const { password: _pw, refreshToken: _rt, ...userWithoutSensitive } = userObj;

    res.json({ accessToken, user: userWithoutSensitive });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      await User.findOneAndUpdate(
        { refreshToken },
        { refreshToken: null }
      );
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'strict' as const,
      path: '/',
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      throw new AppError('Refresh token not found', 401);
    }

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'demo-refresh-secret-key-minimum-64-chars-for-security-here';
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as {
      userId: string;
    };

    // Demo user refresh bypass
    if (decoded.userId === 'demo-user-id-001') {
      const jwtSecret = process.env.JWT_SECRET || 'demo-jwt-secret-key-minimum-64-chars-for-security-purposes-here';
      const newAccessToken = jwt.sign({ userId: 'demo-user-id-001' }, jwtSecret, { expiresIn: '24h' as any });
      res.json({ accessToken: newAccessToken });
      return;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (user.refreshToken !== refreshToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    const newAccessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
    );

    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
    );

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'strict' as const,
      path: '/',
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      res.json({ message: 'If an account with that email exists, a reset link has been sent' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await emailService.sendForgotPassword(user.email, user.name, resetToken);

    res.json({ message: 'If an account with that email exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AppError('Token and new password are required', 400);
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

export const me = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
};

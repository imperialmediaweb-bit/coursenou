import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  // A schema rejection is the caller's fault, not ours. Letting it fall through
  // turned "Password must be at least 8 characters" into a 500 and a generic
  // "An unexpected error occurred", which tells the person nothing about what
  // to change. Handled here so every endpoint gets it, whether it validates
  // with parse() or safeParse().
  if (err instanceof ZodError) {
    const first = err.errors[0];
    const field = first?.path?.join('.');
    res.status(400).json({
      error: first?.message || 'Invalid request',
      ...(field ? { field } : {}),
    });
    return;
  }

  // Log unexpected errors but don't expose details in production
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unexpected error:', err);
  } else {
    console.error('Unexpected error:', err.message);
  }

  res.status(500).json({
    error: 'An unexpected error occurred. Please try again later.',
  });
};

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import prisma from '../utils/prisma';

export const bulkExport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;

    const courses = await prisma.course.findMany({
      where: { userId: user._id as string },
      orderBy: { createdAt: 'desc' },
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="courses-export.json"'
    );

    res.status(200).json(courses);
  } catch (error) {
    next(error);
  }
};

export const exportAdminCSV = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;

    if (user.role !== 'admin') {
      throw new AppError('Admin access required', 403);
    }

    const invoices = await prisma.invoice.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Build CSV
    const headers = 'Date,User,Email,Amount,Currency,Plan,Provider,Status';
    const rows = invoices.map((invoice) => {
      const invoiceUser = invoice.user as any;
      const date = new Date(invoice.createdAt).toISOString().split('T')[0];
      const userName = invoiceUser?.name || 'N/A';
      const email = invoiceUser?.email || 'N/A';
      // Escape CSV fields that might contain commas
      const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
      return `${date},${escapeCsv(userName)},${escapeCsv(email)},${invoice.amount},${invoice.currency},${invoice.plan},${invoice.provider},${invoice.status}`;
    });

    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="invoices-export.csv"'
    );

    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

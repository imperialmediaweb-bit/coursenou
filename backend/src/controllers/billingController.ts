import { Response, NextFunction } from 'express';
import puppeteer from 'puppeteer';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { PLAN_PRICES } from '../utils/planLimits';
import prisma from '../utils/prisma';
import { reconcileSubscription } from '../services/reconcileService';

export const getPlans = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'usd',
        features: [
          'Up to 5 topics per course',
          'Up to 10 courses',
          'Image-based courses',
          'Ad-supported',
        ],
      },
      {
        id: 'monthly',
        name: PLAN_PRICES.monthly.label,
        price: PLAN_PRICES.monthly.amount,
        currency: PLAN_PRICES.monthly.currency,
        features: [
          'Up to 20 topics per course',
          'Unlimited courses',
          'Video & audio courses',
          'PowerPoint export',
          'No ads',
        ],
      },
      {
        id: 'yearly',
        name: PLAN_PRICES.yearly.label,
        price: PLAN_PRICES.yearly.amount,
        currency: PLAN_PRICES.yearly.currency,
        features: [
          'Up to 20 topics per course',
          'Unlimited courses',
          'Video & audio courses',
          'PowerPoint export',
          'No ads',
        ],
      },
    ];

    res.json(plans);
  } catch (error) {
    next(error);
  }
};

export const getSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001') {
      res.json({ subscription: null, plan: req.user!.plan, planExpiresAt: req.user!.planExpiresAt });
      return;
    }
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user!._id as string,
        status: 'active',
      },
    });

    res.json({
      subscription,
      plan: req.user!.plan,
      planExpiresAt: req.user!.planExpiresAt,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoices = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (String(req.user!._id) === 'demo-user-id-001') {
      res.json({ success: true, data: [] });
      return;
    }
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user!._id as string },
      orderBy: { createdAt: 'desc' },
    });
    res.json(invoices);
  } catch (error) {
    next(error);
  }
};

export const downloadInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.userId !== req.user!._id) {
      throw new AppError('Not authorized to access this invoice', 403);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #6366f1; margin: 0; }
          .invoice-info { text-align: right; }
          .invoice-info p { margin: 4px 0; color: #666; }
          .details { margin: 30px 0; }
          .details table { width: 100%; border-collapse: collapse; }
          .details th { background-color: #f3f4f6; text-align: left; padding: 10px; border-bottom: 1px solid #e5e7eb; }
          .details td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
          .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; color: #6366f1; }
          .footer { margin-top: 60px; text-align: center; color: #9ca3af; font-size: 12px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
          .status-paid { background-color: #d1fae5; color: #065f46; }
          .status-failed { background-color: #fee2e2; color: #991b1b; }
          .status-pending { background-color: #fef3c7; color: #92400e; }
          .status-refunded { background-color: #e0e7ff; color: #3730a3; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CourseBit</h1>
          <div class="invoice-info">
            <p><strong>Invoice</strong></p>
            <p>ID: ${invoice.id}</p>
            <p>Date: ${new Date(invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        <div class="details">
          <p><strong>Billed to:</strong> ${req.user!.name} (${req.user!.email})</p>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Plan</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CourseBit Subscription</td>
                <td>${invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1)}</td>
                <td>${invoice.provider.charAt(0).toUpperCase() + invoice.provider.slice(1)}</td>
                <td><span class="status status-${invoice.status}">${invoice.status.toUpperCase()}</span></td>
                <td>${invoice.amount.toFixed(2)} ${invoice.currency.toUpperCase()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="total">
          Total: ${invoice.amount.toFixed(2)} ${invoice.currency.toUpperCase()}
        </div>
        <div class="footer">
          <p>Thank you for your subscription!</p>
          <p>&copy; ${new Date().getFullYear()} CourseBit. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice-${invoice.id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Recovers a payment whose webhook never arrived.
 *
 * Called when someone comes back from checkout. If the provider says they have
 * an active subscription and this account is still on the free plan, the
 * subscription is activated here rather than leaving a paying customer locked
 * out until somebody notices.
 */
export const reconcile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = String(req.user!._id || (req.user as any).id);
    if (userId === 'demo-user-id-001') {
      res.json({ success: true, data: { activated: false, reason: 'Demo account' } });
      return;
    }

    const result = await reconcileSubscription(userId);

    if (result.activated) {
      console.log(`Reconciled ${result.provider} subscription for ${userId} — webhook had not arrived`);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

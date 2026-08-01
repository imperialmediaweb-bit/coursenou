import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { DEFAULT_LEGAL_PAGES } from './legalPages';

/**
 * Creates the legal pages if they are missing. /terms and /privacy were
 * reachable routes with nothing behind them, so both rendered "Page Not
 * Found" — and both are a precondition for a live Stripe or PayPal account.
 * Existing rows are never overwritten, so admin edits survive a restart.
 */
export async function seedLegalPages(): Promise<void> {
  for (const page of DEFAULT_LEGAL_PAGES) {
    try {
      const existing = await prisma.contentPage.findUnique({ where: { slug: page.slug } });
      if (existing && existing.content.trim()) continue;

      await prisma.contentPage.upsert({
        where: { slug: page.slug },
        create: { slug: page.slug, content: page.content },
        update: { content: page.content },
      });
      console.log(`Seeded legal page: /${page.slug}`);
    } catch (error: any) {
      console.error(`Failed to seed /${page.slug}:`, error.message);
    }
  }
}

export async function seedDemoAccount(): Promise<void> {
  try {
    const demoEmail = 'demo@coursbit.com';
    const existing = await prisma.user.findUnique({ where: { email: demoEmail } });
    if (existing) return;

    const hashedPassword = await bcrypt.hash('demo123456', 12);
    await prisma.user.create({ data: {
      name: 'Demo User',
      email: demoEmail,
      password: hashedPassword,
      role: 'user',
      plan: 'monthly',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      aiProvider: 'gemini',
    }});

    console.log('Demo account seeded: demo@coursbit.com / demo123456');
  } catch (error: any) {
    console.error('Demo seed failed:', error.message);
  }
}

import bcrypt from 'bcryptjs';
import prisma from './prisma';

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

import bcrypt from 'bcryptjs';
import User from '../models/User';

export async function seedDemoAccount(): Promise<void> {
  try {
    const demoEmail = 'demo@coursbit.com';
    const existing = await User.findOne({ email: demoEmail });
    if (existing) return;

    const hashedPassword = await bcrypt.hash('demo123456', 12);
    await User.create({
      name: 'Demo User',
      email: demoEmail,
      password: hashedPassword,
      role: 'user',
      plan: 'monthly',
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      aiProvider: 'gemini',
    });

    console.log('Demo account seeded: demo@coursbit.com / demo123456');
  } catch (error: any) {
    console.error('Demo seed failed:', error.message);
  }
}

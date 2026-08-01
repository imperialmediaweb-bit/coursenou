import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { notificationService } from '../services/notificationService';

const XP_VALUES = {
  COURSE_CREATED: 50,
  COURSE_COMPLETED: 100,
  QUIZ_PASSED: 75,
  QUIZ_FAILED: 10,
  FLASHCARD_SESSION: 15,
  STREAK_BONUS: 25,
};

const LEVELS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 20000];

function calculateLevel(xp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i]) return i + 1;
  }
  return 1;
}

export const getStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = String(req.user!._id || (req.user as any).id);

    if (userId === 'demo-user-id-001') {
      const demoStats = {
        xp: req.user!.xp || 150,
        level: req.user!.level || 2,
        streak: req.user!.streak || 3,
        nextLevelXp: LEVELS[2] || 250,
        currentLevelXp: LEVELS[1] || 100,
        xpValues: XP_VALUES,
      };
      res.json({ success: true, data: demoStats });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true, level: true, streak: true, lastActiveDate: true } });
    if (!user) {
      res.json({ success: true, data: { xp: 0, level: 1, streak: 0, nextLevelXp: 100, currentLevelXp: 0, xpValues: XP_VALUES } });
      return;
    }

    const level = calculateLevel(user.xp);
    const nextLevelXp = LEVELS[level] || LEVELS[LEVELS.length - 1];
    const currentLevelXp = LEVELS[level - 1] || 0;

    res.json({ success: true, data: { xp: user.xp, level, streak: user.streak, nextLevelXp, currentLevelXp, xpValues: XP_VALUES } });
  } catch (error) { next(error); }
};

export const addXP = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = String(req.user!._id || (req.user as any).id);
    const { action } = req.body;

    if (!action || !XP_VALUES[action as keyof typeof XP_VALUES]) {
      res.status(400).json({ error: 'Invalid action' });
      return;
    }

    const xpGain = XP_VALUES[action as keyof typeof XP_VALUES];

    if (userId === 'demo-user-id-001') {
      const currentXp = (req.user!.xp || 0) + xpGain;
      const level = calculateLevel(currentXp);
      res.json({ success: true, data: { xpGained: xpGain, totalXp: currentXp, level, action } });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    // Check streak
    const now = new Date();
    const lastActive = user.lastActiveDate;
    let newStreak = user.streak;
    let bonusXp = 0;

    if (lastActive) {
      const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / 86400000);
      if (diffDays === 1) {
        newStreak += 1;
        if (newStreak % 7 === 0) bonusXp = XP_VALUES.STREAK_BONUS;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const totalXpGain = xpGain + bonusXp;
    const newXp = user.xp + totalXpGain;
    const newLevel = calculateLevel(newXp);

    await prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel, streak: newStreak, lastActiveDate: now },
    });

    if (newLevel > user.level) {
      notificationService.levelUp(userId, newLevel).catch(() => {});
    }

    res.json({ success: true, data: { xpGained: totalXpGain, totalXp: newXp, level: newLevel, streak: newStreak, levelUp: newLevel > user.level, action } });
  } catch (error) { next(error); }
};

import prisma from '../utils/prisma';

/**
 * In-app notifications.
 *
 * The Notifications page used to be a hardcoded "You're all caught up" empty
 * state with no model, no API and no way for anything to ever appear in it.
 * These are the real events the product already knows about, recorded as they
 * happen so the bell reflects something true.
 *
 * Creating a notification must never break the action that triggered it, so
 * every write here swallows its own errors.
 */

export type NotificationType =
  | 'course_created'
  | 'course_completed'
  | 'certificate_earned'
  | 'quiz_passed'
  | 'subscription_activated'
  | 'subscription_cancelled'
  | 'payment_received'
  | 'level_up'
  | 'welcome';

const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

class NotificationService {
  private async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    link?: string
  ): Promise<void> {
    // Demo sessions have no database row to attach to.
    if (!userId || userId === 'demo-user-id-001') return;

    try {
      await prisma.notification.create({
        data: { userId, type, title, body, link: link || null },
      });
    } catch (error: any) {
      console.error('Failed to record notification:', error.message || error);
    }
  }

  welcome(userId: string, name: string): Promise<void> {
    return this.create(
      userId,
      'welcome',
      `Welcome to Coursbit, ${name.split(' ')[0]}`,
      'Generate your first course in a couple of minutes — pick a subject and we will build the outline for you.',
      '/create'
    );
  }

  courseCreated(userId: string, courseId: string, title: string, lessons: number): Promise<void> {
    return this.create(
      userId,
      'course_created',
      'Your course is ready',
      `"${title}" was generated with ${lessons} ${lessons === 1 ? 'lesson' : 'lessons'}.`,
      `/course/${courseId}`
    );
  }

  courseCompleted(userId: string, courseId: string, title: string): Promise<void> {
    return this.create(
      userId,
      'course_completed',
      'Course completed',
      `You finished "${title}". Your certificate is ready to download.`,
      `/course/${courseId}`
    );
  }

  certificateEarned(userId: string, certificateId: string, courseTitle: string): Promise<void> {
    return this.create(
      userId,
      'certificate_earned',
      'Certificate earned',
      `You earned a certificate for "${courseTitle}".`,
      `/certificate/${certificateId}`
    );
  }

  quizPassed(userId: string, courseId: string, score: number, total: number): Promise<void> {
    return this.create(
      userId,
      'quiz_passed',
      'Quiz passed',
      `You scored ${score}/${total}. Nicely done.`,
      `/course/${courseId}/quiz`
    );
  }

  levelUp(userId: string, level: number): Promise<void> {
    return this.create(
      userId,
      'level_up',
      `You reached level ${level}`,
      'Keep the streak going — every completed lesson adds XP.',
      '/dashboard'
    );
  }

  subscriptionActivated(userId: string, plan: string, renewsAt: Date): Promise<void> {
    return this.create(
      userId,
      'subscription_activated',
      'Subscription active',
      `Your ${plan} plan is active until ${formatDate(renewsAt)}.`,
      '/billing'
    );
  }

  subscriptionCancelled(userId: string, accessUntil: Date): Promise<void> {
    return this.create(
      userId,
      'subscription_cancelled',
      'Subscription cancelled',
      `You keep premium access until ${formatDate(accessUntil)}.`,
      '/billing'
    );
  }

  paymentReceived(
    userId: string,
    amount: number,
    currency: string,
    renewsAt: Date
  ): Promise<void> {
    return this.create(
      userId,
      'payment_received',
      'Payment received',
      `${amount.toFixed(2)} ${currency.toUpperCase()} — your plan now runs to ${formatDate(renewsAt)}.`,
      '/billing'
    );
  }
}

export const notificationService = new NotificationService();

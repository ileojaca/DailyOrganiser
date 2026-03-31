/**
 * Digital Detox Utility
 * 
 * Manages digital detox plans and provides recommendations
 * for reducing screen time and digital distractions.
 */

import type { DigitalDetoxPlan } from '@/types/lifeManagement';

type DetoxType = 'micro' | 'mini' | 'full';

interface DetoxRecommendation {
  type: DetoxType;
  duration: string;
  activities: string[];
  benefits: string[];
}

export class DigitalDetox {
  /**
   * Create a digital detox plan
   */
  createPlan(
    userId: string,
    type: DetoxType,
    scheduledTime: Date,
    activities: string[]
  ): DigitalDetoxPlan {
    return {
      id: `detox_${Date.now()}`,
      userId,
      type,
      scheduledTime,
      activities,
      notifications: true,
      autoEnable: type === 'micro',
      completed: false,
      createdAt: new Date(),
    };
  }

  /**
   * Get detox recommendations based on type
   */
  getRecommendations(type: DetoxType): DetoxRecommendation {
    switch (type) {
      case 'micro':
        return {
          type: 'micro',
          duration: '15 minutes',
          activities: [
            'Take a short walk',
            'Practice deep breathing',
            'Stretch or do light yoga',
            'Drink water mindfully',
            'Look at something far away',
          ],
          benefits: [
            'Reduces eye strain',
            'Improves focus',
            'Boosts energy',
            'Reduces stress',
          ],
        };
      case 'mini':
        return {
          type: 'mini',
          duration: '2 hours',
          activities: [
            'Read a physical book',
            'Go for a walk in nature',
            'Cook a meal',
            'Practice a hobby',
            'Have a face-to-face conversation',
            'Exercise',
            'Meditate',
          ],
          benefits: [
            'Improves sleep quality',
            'Enhances creativity',
            'Strengthens relationships',
            'Reduces anxiety',
          ],
        };
      case 'full':
        return {
          type: 'full',
          duration: 'Full day',
          activities: [
            'Spend time outdoors',
            'Connect with family and friends',
            'Engage in physical activities',
            'Practice mindfulness',
            'Pursue creative projects',
            'Rest and recharge',
          ],
          benefits: [
            'Deep mental reset',
            'Improved focus and productivity',
            'Better sleep',
            'Enhanced well-being',
            'Stronger relationships',
          ],
        };
      default:
        return {
          type: 'micro',
          duration: '15 minutes',
          activities: [],
          benefits: [],
        };
    }
  }

  /**
   * Get detox type label
   */
  getTypeLabel(type: DetoxType): string {
    switch (type) {
      case 'micro':
        return 'Micro Detox';
      case 'mini':
        return 'Mini Detox';
      case 'full':
        return 'Full Detox';
      default:
        return 'Detox';
    }
  }

  /**
   * Get detox type icon
   */
  getTypeIcon(type: DetoxType): string {
    switch (type) {
      case 'micro':
        return '⚡';
      case 'mini':
        return '🌿';
      case 'full':
        return '🧘';
      default:
        return '📱';
    }
  }

  /**
   * Get detox type color
   */
  getTypeColor(type: DetoxType): string {
    switch (type) {
      case 'micro':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      case 'mini':
        return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      case 'full':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400';
    }
  }

  /**
   * Schedule a detox reminder
   */
  scheduleReminder(plan: DigitalDetoxPlan): Date {
    const reminderTime = new Date(plan.scheduledTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 15); // 15 minutes before
    return reminderTime;
  }

  /**
   * Check if detox is active
   */
  isActive(plan: DigitalDetoxPlan): boolean {
    const now = new Date();
    const scheduledTime = new Date(plan.scheduledTime);
    const endTime = new Date(scheduledTime);

    switch (plan.type) {
      case 'micro':
        endTime.setMinutes(endTime.getMinutes() + 15);
        break;
      case 'mini':
        endTime.setHours(endTime.getHours() + 2);
        break;
      case 'full':
        endTime.setHours(endTime.getHours() + 24);
        break;
    }

    return now >= scheduledTime && now <= endTime;
  }

  /**
   * Get time remaining in detox
   */
  getTimeRemaining(plan: DigitalDetoxPlan): string {
    const now = new Date();
    const scheduledTime = new Date(plan.scheduledTime);
    const endTime = new Date(scheduledTime);

    switch (plan.type) {
      case 'micro':
        endTime.setMinutes(endTime.getMinutes() + 15);
        break;
      case 'mini':
        endTime.setHours(endTime.getHours() + 2);
        break;
      case 'full':
        endTime.setHours(endTime.getHours() + 24);
        break;
    }

    const remaining = endTime.getTime() - now.getTime();
    if (remaining <= 0) return 'Completed';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  }

  /**
   * Generate detox tips
   */
  getTips(): string[] {
    return [
      'Turn off non-essential notifications',
      'Use grayscale mode on your phone',
      'Set specific times for checking emails',
      'Create phone-free zones (bedroom, dining table)',
      'Use apps to track screen time',
      'Replace screen time with physical activities',
      'Practice the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds',
    ];
  }

  /**
   * Calculate detox score based on completion
   */
  calculateScore(plans: DigitalDetoxPlan[]): number {
    if (plans.length === 0) return 0;

    const completed = plans.filter(p => p.completed).length;
    return Math.round((completed / plans.length) * 100);
  }

  /**
   * Get detox streak
   */
  getStreak(plans: DigitalDetoxPlan[]): number {
    if (plans.length === 0) return 0;

    const sortedPlans = [...plans].sort(
      (a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const plan of sortedPlans) {
      const planDate = new Date(plan.scheduledTime);
      planDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (today.getTime() - planDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === streak && plan.completed) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}

// Export singleton instance
export const digitalDetox = new DigitalDetox();

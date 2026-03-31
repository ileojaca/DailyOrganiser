/**
 * Smart Reminder Utility
 * 
 * Provides intelligent reminders based on user patterns,
 * context, and optimal timing.
 */

interface Reminder {
  id: string;
  type: 'task' | 'goal' | 'habit' | 'break' | 'family' | 'sleep';
  title: string;
  message: string;
  scheduledTime: Date;
  priority: 'high' | 'medium' | 'low';
  recurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  context?: string;
  dismissed: boolean;
  snoozedUntil?: Date;
}

interface ReminderPattern {
  userId: string;
  bestReminderTimes: string[];
  responseRate: Record<string, number>;
  preferredReminderTypes: string[];
}

export class SmartReminder {
  /**
   * Create a smart reminder
   */
  createReminder(
    type: Reminder['type'],
    title: string,
    message: string,
    scheduledTime: Date,
    options: {
      priority?: Reminder['priority'];
      recurring?: boolean;
      recurringPattern?: Reminder['recurringPattern'];
      context?: string;
    } = {}
  ): Reminder {
    return {
      id: `reminder_${Date.now()}`,
      type,
      title,
      message,
      scheduledTime,
      priority: options.priority || 'medium',
      recurring: options.recurring || false,
      recurringPattern: options.recurringPattern,
      context: options.context,
      dismissed: false,
    };
  }

  /**
   * Get optimal reminder time based on user patterns
   */
  getOptimalReminderTime(
    baseTime: Date,
    pattern: ReminderPattern,
    type: Reminder['type']
  ): Date {
    const optimalTime = new Date(baseTime);

    // Adjust based on user's best reminder times
    if (pattern.bestReminderTimes.length > 0) {
      const bestTime = pattern.bestReminderTimes[0];
      const [hours, minutes] = bestTime.split(':').map(Number);
      optimalTime.setHours(hours, minutes, 0, 0);
    }

    // Adjust based on reminder type
    switch (type) {
      case 'task':
        // Remind 15 minutes before task
        optimalTime.setMinutes(optimalTime.getMinutes() - 15);
        break;
      case 'break':
        // Remind at exact time
        break;
      case 'sleep':
        // Remind 30 minutes before sleep
        optimalTime.setMinutes(optimalTime.getMinutes() - 30);
        break;
      case 'family':
        // Remind 1 hour before family time
        optimalTime.setMinutes(optimalTime.getMinutes() - 60);
        break;
    }

    return optimalTime;
  }

  /**
   * Generate contextual reminder message
   */
  generateContextualMessage(
    type: Reminder['type'],
    context?: string
  ): string {
    const messages: Record<Reminder['type'], string[]> = {
      task: [
        'Time to focus on your task!',
        'Ready to tackle your next task?',
        'Let\'s make progress on your goals!',
      ],
      goal: [
        'Remember your goal: {context}',
        'Keep working towards: {context}',
        'You\'re making progress on: {context}',
      ],
      habit: [
        'Time for your daily habit!',
        'Consistency is key - keep it up!',
        'Don\'t break your streak!',
      ],
      break: [
        'Time for a break! Stretch and relax.',
        'You\'ve earned a rest. Take a break!',
        'Step away and recharge.',
      ],
      family: [
        'Family time is coming up!',
        'Don\'t forget your family plans!',
        'Time to connect with loved ones.',
      ],
      sleep: [
        'Time to wind down for sleep!',
        'Prepare for a good night\'s rest.',
        'Sleep is important - get ready!',
      ],
    };

    const typeMessages = messages[type] || messages.task;
    const message = typeMessages[Math.floor(Math.random() * typeMessages.length)];

    return message.replace('{context}', context || '');
  }

  /**
   * Snooze a reminder
   */
  snoozeReminder(reminder: Reminder, minutes: number): Reminder {
    const snoozedUntil = new Date();
    snoozedUntil.setMinutes(snoozedUntil.getMinutes() + minutes);

    return {
      ...reminder,
      snoozedUntil,
    };
  }

  /**
   * Dismiss a reminder
   */
  dismissReminder(reminder: Reminder): Reminder {
    return {
      ...reminder,
      dismissed: true,
    };
  }

  /**
   * Check if reminder should be shown
   */
  shouldShowReminder(reminder: Reminder): boolean {
    if (reminder.dismissed) return false;

    const now = new Date();
    const scheduledTime = new Date(reminder.scheduledTime);

    // Check if snoozed
    if (reminder.snoozedUntil) {
      const snoozedUntil = new Date(reminder.snoozedUntil);
      if (now < snoozedUntil) return false;
    }

    // Check if it's time to show
    return now >= scheduledTime;
  }

  /**
   * Get reminder priority color
   */
  getPriorityColor(priority: Reminder['priority']): string {
    const colors: Record<Reminder['priority'], string> = {
      high: 'text-red-600 dark:text-red-400',
      medium: 'text-yellow-600 dark:text-yellow-400',
      low: 'text-green-600 dark:text-green-400',
    };
    return colors[priority];
  }

  /**
   * Get reminder type icon
   */
  getTypeIcon(type: Reminder['type']): string {
    const icons: Record<Reminder['type'], string> = {
      task: '✅',
      goal: '🎯',
      habit: '🔄',
      break: '☕',
      family: '👨‍👩‍👧‍👦',
      sleep: '😴',
    };
    return icons[type];
  }

  /**
   * Calculate reminder effectiveness
   */
  calculateEffectiveness(
    reminders: Reminder[],
    completedActions: number
  ): number {
    if (reminders.length === 0) return 0;

    const dismissed = reminders.filter(r => r.dismissed).length;
    const responseRate = dismissed / reminders.length;

    return Math.round(responseRate * 100);
  }

  /**
   * Generate daily reminder schedule
   */
  generateDailySchedule(
    wakeTime: string,
    sleepTime: string,
    workStart: string,
    workEnd: string
  ): Array<{ time: string; type: Reminder['type']; message: string }> {
    const schedule: Array<{ time: string; type: Reminder['type']; message: string }> = [];

    // Morning routine
    schedule.push({
      time: wakeTime,
      type: 'habit',
      message: 'Good morning! Start your day with intention.',
    });

    // Work start
    schedule.push({
      time: workStart,
      type: 'task',
      message: 'Time to focus on your most important tasks!',
    });

    // Mid-morning break
    const midMorning = this.addHours(workStart, 2);
    schedule.push({
      time: midMorning,
      type: 'break',
      message: 'Take a short break to recharge!',
    });

    // Lunch break
    const lunch = this.addHours(workStart, 4);
    schedule.push({
      time: lunch,
      type: 'break',
      message: 'Time for lunch! Nourish your body.',
    });

    // Afternoon break
    const afternoon = this.addHours(workStart, 6);
    schedule.push({
      time: afternoon,
      type: 'break',
      message: 'Afternoon stretch break!',
    });

    // Work end
    schedule.push({
      time: workEnd,
      type: 'task',
      message: 'Wrap up your work day!',
    });

    // Family time
    const familyTime = this.addHours(workEnd, 1);
    schedule.push({
      time: familyTime,
      type: 'family',
      message: 'Quality time with family!',
    });

    // Sleep preparation
    const sleepPrep = this.subtractMinutes(sleepTime, 30);
    schedule.push({
      time: sleepPrep,
      type: 'sleep',
      message: 'Start winding down for sleep!',
    });

    return schedule;
  }

  /**
   * Add hours to time string
   */
  private addHours(time: string, hours: number): string {
    const [h, m] = time.split(':').map(Number);
    const newHours = (h + hours) % 24;
    return `${newHours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Subtract minutes from time string
   */
  private subtractMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    let totalMinutes = h * 60 + m - minutes;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  }

  /**
   * Get snooze options
   */
  getSnoozeOptions(): Array<{ label: string; minutes: number }> {
    return [
      { label: '5 minutes', minutes: 5 },
      { label: '15 minutes', minutes: 15 },
      { label: '30 minutes', minutes: 30 },
      { label: '1 hour', minutes: 60 },
      { label: '2 hours', minutes: 120 },
    ];
  }
}

// Export singleton instance
export const smartReminder = new SmartReminder();

/**
 * Weekly Review Utility
 * 
 * Generates comprehensive weekly reviews with insights,
 * recommendations, and progress tracking.
 */

interface WeeklyData {
  tasksCompleted: number;
  totalTasks: number;
  hoursWorked: number;
  familyTime: number;
  personalTime: number;
  restQuality: number;
  sleepHours: number;
  exerciseMinutes: number;
  meditationSessions: number;
  goalsProgress: Array<{
    goalId: string;
    title: string;
    progress: number;
  }>;
}

interface WeeklyReview {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  workLifeBalance: number;
  familyTime: number;
  personalTime: number;
  restQuality: number;
  insights: string[];
  recommendations: string[];
  celebrations: string[];
  warnings: string[];
  createdAt: Date;
}

export class WeeklyReviewGenerator {
  /**
   * Generate weekly review from data
   */
  generateReview(data: WeeklyData, weekStart: Date): WeeklyReview {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Calculate work-life balance score
    const workLifeBalance = this.calculateWorkLifeBalance(data);

    // Generate insights
    const insights = this.generateInsights(data);

    // Generate recommendations
    const recommendations = this.generateRecommendations(data);

    // Generate celebrations
    const celebrations = this.generateCelebrations(data);

    // Generate warnings
    const warnings = this.generateWarnings(data);

    return {
      id: `review_${Date.now()}`,
      weekStart,
      weekEnd,
      workLifeBalance,
      familyTime: data.familyTime,
      personalTime: data.personalTime,
      restQuality: data.restQuality,
      insights,
      recommendations,
      celebrations,
      warnings,
      createdAt: new Date(),
    };
  }

  /**
   * Calculate work-life balance score
   */
  private calculateWorkLifeBalance(data: WeeklyData): number {
    let score = 50; // Base score

    // Task completion bonus
    const completionRate = data.tasksCompleted / Math.max(1, data.totalTasks);
    score += completionRate * 20;

    // Family time bonus
    if (data.familyTime >= 15) score += 15;
    else if (data.familyTime >= 10) score += 10;
    else if (data.familyTime >= 5) score += 5;

    // Personal time bonus
    if (data.personalTime >= 10) score += 10;
    else if (data.personalTime >= 5) score += 5;

    // Rest quality bonus
    if (data.restQuality >= 8) score += 10;
    else if (data.restQuality >= 6) score += 5;

    // Sleep bonus
    if (data.sleepHours >= 7 && data.sleepHours <= 9) score += 5;

    // Exercise bonus
    if (data.exerciseMinutes >= 150) score += 5;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Generate insights from data
   */
  private generateInsights(data: WeeklyData): string[] {
    const insights: string[] = [];

    // Task completion insights
    const completionRate = (data.tasksCompleted / Math.max(1, data.totalTasks)) * 100;
    if (completionRate >= 90) {
      insights.push('Excellent task completion rate! You\'re highly productive.');
    } else if (completionRate >= 70) {
      insights.push('Good task completion rate. Keep up the momentum!');
    } else if (completionRate < 50) {
      insights.push('Task completion was low. Consider breaking tasks into smaller pieces.');
    }

    // Work-life balance insights
    if (data.hoursWorked > 50) {
      insights.push('You worked over 50 hours. Consider setting boundaries.');
    }

    // Family time insights
    if (data.familyTime < 10) {
      insights.push('Family time was below 10 hours. Prioritize relationships.');
    } else if (data.familyTime >= 20) {
      insights.push('Great job spending quality time with family!');
    }

    // Sleep insights
    if (data.sleepHours < 7) {
      insights.push('You\'re getting less than 7 hours of sleep. Prioritize rest.');
    } else if (data.sleepHours > 9) {
      insights.push('You\'re sleeping over 9 hours. Consider if you need this much.');
    }

    // Exercise insights
    if (data.exerciseMinutes < 150) {
      insights.push('Exercise was below recommended levels. Aim for 150 minutes weekly.');
    } else if (data.exerciseMinutes >= 300) {
      insights.push('Excellent exercise routine! You\'re exceeding recommendations.');
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(data: WeeklyData): string[] {
    const recommendations: string[] = [];

    // Task management recommendations
    const completionRate = data.tasksCompleted / Math.max(1, data.totalTasks);
    if (completionRate < 0.7) {
      recommendations.push('Try breaking large tasks into smaller, manageable pieces');
      recommendations.push('Use the Pomodoro technique to maintain focus');
    }

    // Work-life balance recommendations
    if (data.hoursWorked > 45) {
      recommendations.push('Set a hard stop time for work each day');
      recommendations.push('Delegate tasks when possible');
    }

    // Family time recommendations
    if (data.familyTime < 15) {
      recommendations.push('Schedule at least one family activity per weekend');
      recommendations.push('Have device-free dinners with family');
    }

    // Sleep recommendations
    if (data.sleepHours < 7) {
      recommendations.push('Establish a consistent bedtime routine');
      recommendations.push('Avoid screens 1 hour before bed');
    }

    // Exercise recommendations
    if (data.exerciseMinutes < 150) {
      recommendations.push('Schedule exercise like any other important appointment');
      recommendations.push('Start with 10-minute walks and gradually increase');
    }

    // Meditation recommendations
    if (data.meditationSessions < 3) {
      recommendations.push('Try 5-minute meditation sessions to build the habit');
    }

    return recommendations;
  }

  /**
   * Generate celebrations
   */
  private generateCelebrations(data: WeeklyData): string[] {
    const celebrations: string[] = [];

    // Task completion celebrations
    if (data.tasksCompleted >= 20) {
      celebrations.push(`Completed ${data.tasksCompleted} tasks this week!`);
    }

    // Goal progress celebrations
    for (const goal of data.goalsProgress) {
      if (goal.progress >= 50) {
        celebrations.push(`${goal.title} is ${goal.progress}% complete!`);
      }
    }

    // Exercise celebrations
    if (data.exerciseMinutes >= 300) {
      celebrations.push('Exercised for over 5 hours this week!');
    }

    // Meditation celebrations
    if (data.meditationSessions >= 7) {
      celebrations.push('Meditated every day this week!');
    }

    // Family time celebrations
    if (data.familyTime >= 20) {
      celebrations.push('Spent quality time with family!');
    }

    return celebrations;
  }

  /**
   * Generate warnings
   */
  private generateWarnings(data: WeeklyData): string[] {
    const warnings: string[] = [];

    // Overwork warnings
    if (data.hoursWorked > 60) {
      warnings.push('Working over 60 hours increases burnout risk');
    }

    // Sleep deprivation warnings
    if (data.sleepHours < 6) {
      warnings.push('Severe sleep deprivation detected');
    }

    // No exercise warnings
    if (data.exerciseMinutes === 0) {
      warnings.push('No exercise recorded this week');
    }

    // Low family time warnings
    if (data.familyTime < 5) {
      warnings.push('Very low family time - relationships may suffer');
    }

    // Task overload warnings
    if (data.totalTasks > 30) {
      warnings.push('Too many tasks scheduled - consider prioritizing');
    }

    return warnings;
  }

  /**
   * Get balance score color
   */
  getBalanceColor(score: number): string {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  /**
   * Get balance score background
   */
  getBalanceBg(score: number): string {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/20';
    if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  }

  /**
   * Get balance label
   */
  getBalanceLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  }

  /**
   * Calculate week number
   */
  getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Format week range
   */
  formatWeekRange(weekStart: Date): string {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startMonth = weekStart.toLocaleString('default', { month: 'short' });
    const endMonth = weekEnd.toLocaleString('default', { month: 'short' });

    if (startMonth === endMonth) {
      return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}`;
    }
    return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}`;
  }
}

// Export singleton instance
export const weeklyReviewGenerator = new WeeklyReviewGenerator();

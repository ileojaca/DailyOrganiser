/**
 * Gamification Engine Utility
 * 
 * Manages gamification elements including points, achievements,
 * badges, and streaks to motivate users.
 */

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: 'productivity' | 'wellness' | 'family' | 'learning' | 'consistency';
  requirement: {
    type: 'count' | 'streak' | 'threshold';
    value: number;
    metric: string;
  };
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: Date;
}

export interface UserProgress {
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  achievements: Achievement[];
  badges: Badge[];
}

export class GamificationEngine {
  private achievements: Achievement[] = [
    // Productivity achievements
    {
      id: 'first_task',
      name: 'Getting Started',
      description: 'Complete your first task',
      icon: '🎯',
      points: 10,
      category: 'productivity',
      requirement: { type: 'count', value: 1, metric: 'tasks_completed' },
      unlocked: false,
    },
    {
      id: 'task_master_10',
      name: 'Task Master',
      description: 'Complete 10 tasks',
      icon: '⭐',
      points: 50,
      category: 'productivity',
      requirement: { type: 'count', value: 10, metric: 'tasks_completed' },
      unlocked: false,
    },
    {
      id: 'task_master_50',
      name: 'Productivity Pro',
      description: 'Complete 50 tasks',
      icon: '🏆',
      points: 100,
      category: 'productivity',
      requirement: { type: 'count', value: 50, metric: 'tasks_completed' },
      unlocked: false,
    },

    // Wellness achievements
    {
      id: 'early_bird',
      name: 'Early Bird',
      description: 'Complete 5 tasks before 9 AM',
      icon: '🌅',
      points: 30,
      category: 'wellness',
      requirement: { type: 'count', value: 5, metric: 'early_tasks' },
      unlocked: false,
    },
    {
      id: 'zen_master',
      name: 'Zen Master',
      description: 'Complete 7 meditation sessions',
      icon: '🧘',
      points: 40,
      category: 'wellness',
      requirement: { type: 'count', value: 7, metric: 'meditation_sessions' },
      unlocked: false,
    },

    // Family achievements
    {
      id: 'family_first',
      name: 'Family First',
      description: 'Log 10 family activities',
      icon: '👨‍👩‍👧‍👦',
      points: 50,
      category: 'family',
      requirement: { type: 'count', value: 10, metric: 'family_activities' },
      unlocked: false,
    },

    // Learning achievements
    {
      id: 'bookworm',
      name: 'Bookworm',
      description: 'Read for 10 hours',
      icon: '📚',
      points: 60,
      category: 'learning',
      requirement: { type: 'count', value: 600, metric: 'reading_minutes' },
      unlocked: false,
    },

    // Consistency achievements
    {
      id: 'week_warrior',
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '⚔️',
      points: 70,
      category: 'consistency',
      requirement: { type: 'streak', value: 7, metric: 'daily_streak' },
      unlocked: false,
    },
    {
      id: 'month_master',
      name: 'Month Master',
      description: 'Maintain a 30-day streak',
      icon: '📅',
      points: 200,
      category: 'consistency',
      requirement: { type: 'streak', value: 30, metric: 'daily_streak' },
      unlocked: false,
    },
  ];

  /**
   * Initialize user progress
   */
  initializeProgress(): UserProgress {
    return {
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      level: 1,
      achievements: this.achievements.map(a => ({ ...a })),
      badges: [],
    };
  }

  /**
   * Award points for completing an action
   */
  awardPoints(
    progress: UserProgress,
    points: number,
    action: string
  ): UserProgress {
    const newTotal = progress.totalPoints + points;
    const newLevel = this.calculateLevel(newTotal);

    return {
      ...progress,
      totalPoints: newTotal,
      level: newLevel,
    };
  }

  /**
   * Calculate level based on total points
   */
  private calculateLevel(totalPoints: number): number {
    // Level formula: level = floor(sqrt(points / 100)) + 1
    return Math.floor(Math.sqrt(totalPoints / 100)) + 1;
  }

  /**
   * Get points needed for next level
   */
  getPointsToNextLevel(progress: UserProgress): number {
    const nextLevel = progress.level + 1;
    const pointsNeeded = Math.pow(nextLevel - 1, 2) * 100;
    return pointsNeeded - progress.totalPoints;
  }

  /**
   * Update streak
   */
  updateStreak(progress: UserProgress, completed: boolean): UserProgress {
    if (completed) {
      const newStreak = progress.currentStreak + 1;
      return {
        ...progress,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, progress.longestStreak),
      };
    } else {
      return {
        ...progress,
        currentStreak: 0,
      };
    }
  }

  /**
   * Check and unlock achievements
   */
  checkAchievements(
    progress: UserProgress,
    metrics: Record<string, number>
  ): { progress: UserProgress; unlocked: Achievement[] } {
    const unlocked: Achievement[] = [];
    const updatedAchievements = progress.achievements.map(achievement => {
      if (achievement.unlocked) return achievement;

      const metricValue = metrics[achievement.requirement.metric] || 0;
      let shouldUnlock = false;

      switch (achievement.requirement.type) {
        case 'count':
          shouldUnlock = metricValue >= achievement.requirement.value;
          break;
        case 'streak':
          shouldUnlock = progress.currentStreak >= achievement.requirement.value;
          break;
        case 'threshold':
          shouldUnlock = metricValue >= achievement.requirement.value;
          break;
      }

      if (shouldUnlock) {
        unlocked.push({
          ...achievement,
          unlocked: true,
          unlockedAt: new Date(),
        });
        return {
          ...achievement,
          unlocked: true,
          unlockedAt: new Date(),
        };
      }

      return achievement;
    });

    // Award points for unlocked achievements
    let newTotal = progress.totalPoints;
    for (const achievement of unlocked) {
      newTotal += achievement.points;
    }

    return {
      progress: {
        ...progress,
        totalPoints: newTotal,
        level: this.calculateLevel(newTotal),
        achievements: updatedAchievements,
      },
      unlocked,
    };
  }

  /**
   * Award a badge
   */
  awardBadge(
    progress: UserProgress,
    badge: Omit<Badge, 'earnedAt'>
  ): UserProgress {
    const existingBadge = progress.badges.find(b => b.id === badge.id);
    if (existingBadge) return progress;

    return {
      ...progress,
      badges: [
        ...progress.badges,
        { ...badge, earnedAt: new Date() },
      ],
    };
  }

  /**
   * Get achievement progress percentage
   */
  getAchievementProgress(
    achievement: Achievement,
    currentValue: number
  ): number {
    return Math.min(100, (currentValue / achievement.requirement.value) * 100);
  }

  /**
   * Get category color
   */
  getCategoryColor(category: Achievement['category']): string {
    const colors: Record<Achievement['category'], string> = {
      productivity: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      wellness: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      family: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
      learning: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      consistency: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    };
    return colors[category];
  }

  /**
   * Get level title
   */
  getLevelTitle(level: number): string {
    if (level >= 50) return 'Legend';
    if (level >= 40) return 'Master';
    if (level >= 30) return 'Expert';
    if (level >= 20) return 'Professional';
    if (level >= 15) return 'Advanced';
    if (level >= 10) return 'Intermediate';
    if (level >= 5) return 'Apprentice';
    return 'Beginner';
  }

  /**
   * Get leaderboard position (simulated)
   */
  getLeaderboardPosition(totalPoints: number): number {
    // Simulated leaderboard based on points
    if (totalPoints >= 10000) return 1;
    if (totalPoints >= 5000) return Math.floor(10 - (totalPoints / 1000));
    if (totalPoints >= 1000) return Math.floor(100 - (totalPoints / 100));
    return Math.floor(1000 - (totalPoints / 10));
  }

  /**
   * Generate motivational message
   */
  getMotivationalMessage(progress: UserProgress): string {
    const messages = [
      `You're on a ${progress.currentStreak}-day streak! Keep it up!`,
      `Only ${this.getPointsToNextLevel(progress)} points to level ${progress.level + 1}!`,
      `You've unlocked ${progress.achievements.filter(a => a.unlocked).length} achievements!`,
      `Great job! You're in the top ${this.getLeaderboardPosition(progress.totalPoints)}% of users!`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Get daily challenge
   */
  getDailyChallenge(): { task: string; points: number } {
    const challenges = [
      { task: 'Complete 3 tasks before noon', points: 20 },
      { task: 'Take a 15-minute break every 2 hours', points: 15 },
      { task: 'Log a family activity', points: 10 },
      { task: 'Read for 30 minutes', points: 15 },
      { task: 'Exercise for 20 minutes', points: 20 },
      { task: 'Meditate for 10 minutes', points: 15 },
    ];

    return challenges[Math.floor(Math.random() * challenges.length)];
  }
}

// Export singleton instance
export const gamificationEngine = new GamificationEngine();

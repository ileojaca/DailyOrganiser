import { NextRequest, NextResponse } from 'next/server';
import { completeTask, getTask, updateGamification, getGamificationProfile } from '@/lib/firebaseUtils';

/**
 * POST /api/tasks/:id/complete
 * 
 * Mark a task as complete and award points
 * Updates gamification profile (points, streaks, achievements)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const { id: taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    // Get the task
    const taskDoc = await getTask(userId, taskId);
    if (!taskDoc) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskDoc as any;
    if (task.completed) {
      return NextResponse.json({ error: 'Task already completed' }, { status: 400 });
    }

    // Mark task as complete
    const completedTask = await completeTask(userId, taskId);

    // Update gamification
    const gamDoc = await getGamificationProfile(userId);
    const gam = gamDoc as any;

    // Calculate points earned
    const pointsEarned = task.pointsValue || 10;
    const newTotalPoints = (gam.totalPoints || 0) + pointsEarned;
    const newLevel = Math.floor(newTotalPoints / 500);

    // Check for streak
    const today = new Date().toISOString().split('T')[0];
    const lastDate = gam.lastStreakDate || null;
    let newStreak = gam.currentStreak || 0;
    let longestStreak = gam.longestStreak || 0;

    if (lastDate === today) {
      // Already completed a task today, streak continues
      newStreak = gam.currentStreak || 1;
    } else if (lastDate) {
      // Check if streak continues (yesterday or same day)
      const lastDate_obj = new Date(lastDate);
      const today_obj = new Date(today);
      const daysDiff = Math.floor(
        (today_obj.getTime() - lastDate_obj.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Yesterday - continue streak
        newStreak = (gam.currentStreak || 0) + 1;
      } else if (daysDiff > 1) {
        // Streak broken, start over
        newStreak = 1;
      }
    } else {
      // First task ever
      newStreak = 1;
    }

    // Update longest streak
    longestStreak = Math.max(longestStreak, newStreak);

    // Check for achievements
    const achievements = gam.achievements || [];
    const newAchievements = [];

    // 10 tasks achievement
    if (gam.tasksCompleted === 9) {
      newAchievements.push({
        id: 'first-10',
        name: '🎯 Task Master',
        description: 'Complete 10 tasks',
        unlockedAt: new Date(),
      });
    }

    // 100 tasks achievement
    if (gam.tasksCompleted === 99) {
      newAchievements.push({
        id: 'century',
        name: '💯 Century',
        description: 'Complete 100 tasks',
        unlockedAt: new Date(),
      });
    }

    // 7-day streak achievement
    if (newStreak === 7) {
      newAchievements.push({
        id: 'week-warrior',
        name: '⚡ Week Warrior',
        description: 'Maintain a 7-day streak',
        unlockedAt: new Date(),
      });
    }

    // Update gamification profile
    const updatedGam = await updateGamification(userId, {
      totalPoints: newTotalPoints,
      level: newLevel,
      currentStreak: newStreak,
      longestStreak,
      tasksCompleted: (gam.tasksCompleted || 0) + 1,
      totalTimeSpent: (gam.totalTimeSpent || 0) + (task.duration || 0),
      achievements: [...(gam.achievements || []), ...newAchievements],
      lastStreakDate: today,
    });

    return NextResponse.json(
      {
        task: completedTask,
        rewards: {
          pointsEarned,
          newTotalPoints,
          leveledUp: newLevel > (gam.level || 0),
          newLevel,
          streakContinues: newStreak > 1,
          currentStreak: newStreak,
          newAchievements,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 });
  }
}

/**
 * GET /api/tasks/:id/complete
 * Get completion details for a task
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 });
    }

    const { id: taskId } = await params;
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const task = await getTask(userId, taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

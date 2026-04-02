'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDb } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp } from 'firebase/firestore';

interface Habit {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  frequency: 'daily' | 'weekly';
  targetDays?: number; // for weekly habits
  createdAt: Date;
  streak: number;
  lastCompleted: Date | null;
  totalCompletions: number;
}

interface HabitCompletion {
  id: string;
  habitId: string;
  completedAt: Date;
  date: string; // YYYY-MM-DD format
}

const HABIT_ICONS = [
  '💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '🎯', '✍️', '🎵',
  '🌅', '📱', '🚫', '🛏️', '☕', '🍎', '🦷', '🧹', '💼', '🎨'
];

const HABIT_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
];

export default function HabitStreaks() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    color: HABIT_COLORS[0],
    icon: HABIT_ICONS[0],
    frequency: 'daily' as 'daily' | 'weekly',
    targetDays: 1
  });

  useEffect(() => {
    if (!user?.uid) return;

    // Load habits
    const habitsQuery = query(
      collection(getDb(), 'habits'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const habitsUnsubscribe = onSnapshot(habitsQuery, (snapshot) => {
      const habitData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        lastCompleted: doc.data().lastCompleted?.toDate() || null
      })) as Habit[];
      setHabits(habitData);
    });

    // Load completions for today and recent days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completionsQuery = query(
      collection(getDb(), 'habitCompletions'),
      where('userId', '==', user.uid),
      where('completedAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('completedAt', 'desc')
    );

    const completionsUnsubscribe = onSnapshot(completionsQuery, (snapshot) => {
      const completionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt.toDate()
      })) as HabitCompletion[];
      setCompletions(completionData);
    });

    return () => {
      habitsUnsubscribe();
      completionsUnsubscribe();
    };
  }, [user?.uid]);

  const createHabit = async () => {
    if (!user?.uid || !newHabit.name.trim()) return;

    try {
      await addDoc(collection(getDb(), 'habits'), {
        userId: user.uid,
        ...newHabit,
        streak: 0,
        totalCompletions: 0,
        lastCompleted: null,
        createdAt: Timestamp.now()
      });

      setNewHabit({
        name: '',
        description: '',
        color: HABIT_COLORS[0],
        icon: HABIT_ICONS[0],
        frequency: 'daily',
        targetDays: 1
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating habit:', error);
    }
  };

  const completeHabit = async (habitId: string) => {
    if (!user?.uid) return;

    const today = new Date().toISOString().split('T')[0];
    const existingCompletion = completions.find(
      c => c.habitId === habitId && c.date === today
    );

    if (existingCompletion) return; // Already completed today

    try {
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return;

      // Add completion
      await addDoc(collection(getDb(), 'habitCompletions'), {
        userId: user.uid,
        habitId,
        completedAt: Timestamp.now(),
        date: today
      });

      // Update habit streak and stats
      const lastCompleted = habit.lastCompleted;
      let newStreak = habit.streak;

      if (habit.frequency === 'daily') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastCompleted && lastCompleted.toISOString().split('T')[0] === yesterdayStr) {
          newStreak += 1;
        } else if (!lastCompleted || lastCompleted.toISOString().split('T')[0] !== today) {
          newStreak = 1;
        }
      } else {
        // Weekly logic - count completions in current week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekCompletions = completions.filter(c =>
          c.habitId === habitId &&
          new Date(c.completedAt) >= weekStart
        ).length + 1; // +1 for current completion

        newStreak = weekCompletions >= (habit.targetDays || 1) ? habit.streak + 1 : habit.streak;
      }

      await updateDoc(doc(db, 'habits', habitId), {
        streak: newStreak,
        lastCompleted: Timestamp.now(),
        totalCompletions: habit.totalCompletions + 1
      });

    } catch (error) {
      console.error('Error completing habit:', error);
    }
  };

  const isCompletedToday = (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return completions.some(c => c.habitId === habitId && c.date === today);
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '🔥';
    if (streak >= 7) return '⚡';
    if (streak >= 3) return '⭐';
    return '🌱';
  };

  const getLongestStreak = () => {
    return habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
  };

  const getTotalCompletions = () => {
    return habits.reduce((sum, habit) => sum + habit.totalCompletions, 0);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Habit Streaks</h3>
          <p className="text-sm text-gray-500">Build lasting habits with visual progress tracking</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          + New Habit
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{getLongestStreak()}</div>
          <p className="text-xs text-gray-500">Longest Streak</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{getTotalCompletions()}</div>
          <p className="text-xs text-gray-500">Total Completions</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{habits.length}</div>
          <p className="text-xs text-gray-500">Active Habits</p>
        </div>
      </div>

      {/* Create Habit Form */}
      {showCreateForm && (
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Create New Habit</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Habit name"
                value={newHabit.name}
                onChange={(e) => setNewHabit(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <select
                value={newHabit.frequency}
                onChange={(e) => setNewHabit(prev => ({ ...prev, frequency: e.target.value as 'daily' | 'weekly' }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <textarea
              placeholder="Description (optional)"
              value={newHabit.description}
              onChange={(e) => setNewHabit(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={2}
            />

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-700 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                  {HABIT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewHabit(prev => ({ ...prev, icon }))}
                      className={`w-8 h-8 rounded border-2 flex items-center justify-center text-sm ${
                        newHabit.icon === icon ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-sm text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewHabit(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 ${color} ${
                        newHabit.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={createHabit}
                disabled={!newHabit.name.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Create Habit
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Habits List */}
      {habits.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🌱</span>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Habits Yet</h4>
          <p className="text-gray-500 mb-4">Create your first habit to start building streaks!</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Create Your First Habit
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${habit.color} flex items-center justify-center text-white text-lg`}>
                  {habit.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{habit.name}</h4>
                  {habit.description && (
                    <p className="text-sm text-gray-500">{habit.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {habit.frequency === 'daily' ? 'Daily' : `Weekly (${habit.targetDays}x)`}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {habit.totalCompletions} completed
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{getStreakEmoji(habit.streak)}</span>
                    <span className="font-bold text-gray-900">{habit.streak}</span>
                  </div>
                  <p className="text-xs text-gray-500">day streak</p>
                </div>

                <button
                  onClick={() => completeHabit(habit.id)}
                  disabled={isCompletedToday(habit.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    isCompletedToday(habit.id)
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isCompletedToday(habit.id) ? '✓ Done' : 'Complete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Motivational Message */}
      {habits.length > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h4 className="font-medium text-gray-900">Keep Building!</h4>
              <p className="text-sm text-gray-600">
                Consistency is key. Small daily actions lead to remarkable results. You've got this! 💪
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGamification } from '@/hooks/useGamification';
import type { Achievement, Badge } from '@/utils/gamificationEngine';

export default function GamificationDashboard() {
  const { user } = useAuth();
  const { progress, loading } = useGamification();
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'badges'>('overview');

  const getLevelProgress = () => {
    if (!progress) return 0;
    const pointsForCurrentLevel = (progress.level - 1) * 500;
    const pointsForNextLevel = progress.level * 500;
    const progressPercent = ((progress.totalPoints - pointsForCurrentLevel) / (pointsForNextLevel - pointsForCurrentLevel)) * 100;
    return Math.min(100, Math.max(0, progressPercent));
  };

  const getPointsToNextLevel = () => {
    if (!progress) return 0;
    return (progress.level * 500) - progress.totalPoints;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!progress) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Gamification</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'achievements'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Achievements ({progress?.achievements.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'badges'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Badges ({progress?.badges.length || 0})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Level & Points */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <p className="text-sm opacity-80">Level</p>
              <p className="text-3xl font-bold">{progress?.level || 1}</p>
              <div className="mt-2">
                <div className="w-full h-2 bg-white/20 rounded-full">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${getLevelProgress()}%` }}
                  />
                </div>
                <p className="text-xs mt-1 opacity-80">
                  {getPointsToNextLevel()} points to next level
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Points</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {progress?.totalPoints.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Streaks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Streak</p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {progress?.currentStreak || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">days</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="text-sm text-gray-600 dark:text-gray-400">Longest Streak</p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {progress?.longestStreak || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">days</p>
              </div>
            </div>
          </div>

          {/* Recent Achievements */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Recent Achievements
            </h3>
            <div className="space-y-2">
              {progress?.achievements.filter((a: Achievement) => a.unlocked).slice(0, 3).map((achievement: Achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{achievement.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {achievement.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      +{achievement.points}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {achievement.unlockedAt ? new Date(achievement.unlockedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-3">
          {progress?.achievements.filter((a: Achievement) => a.unlocked).map((achievement: Achievement) => (
            <div
              key={achievement.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{achievement.icon}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{achievement.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{achievement.description}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Unlocked: {achievement.unlockedAt ? new Date(achievement.unlockedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  +{achievement.points}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <div className="grid grid-cols-2 gap-4">
          {progress?.badges.map((badge: Badge) => (
            <div
              key={badge.id}
              className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg text-center"
            >
              <span className="text-4xl">{badge.icon}</span>
              <p className="font-medium text-gray-900 dark:text-white mt-2">{badge.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Earned: {new Date(badge.earnedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

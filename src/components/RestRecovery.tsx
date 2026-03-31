'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { RestActivity } from '@/types/lifeManagement';

interface RecoveryMetrics {
  userId: string;
  totalRestTime: number;
  restScore: number;
  recoveryRate: number;
  burnoutRisk: number;
  recommendations: string[];
  calculatedAt: Date;
}

export default function RestRecovery() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<RestActivity[]>([]);
  const [metrics, setMetrics] = useState<RecoveryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'meditation' as RestActivity['type'],
    duration: 15,
    quality: 7,
    notes: '',
  });

  useEffect(() => {
    if (!user) return;

    // Load from localStorage
    const saved = localStorage.getItem(`rest_activities_${user.uid}`);
    if (saved) {
      const records = JSON.parse(saved);
      setActivities(records);
      calculateMetrics(records);
    }
    setLoading(false);
  }, [user]);

  const calculateMetrics = (records: RestActivity[]) => {
    if (records.length === 0) return;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekActivities = records.filter(r => new Date(r.timestamp) >= weekAgo);

    // Calculate total rest time this week
    const totalRestMinutes = weekActivities.reduce((sum, r) => sum + r.duration, 0);
    const totalRestHours = Math.round(totalRestMinutes / 60 * 10) / 10;

    // Calculate average quality
    const avgQuality = weekActivities.reduce((sum, r) => sum + r.quality, 0) / weekActivities.length;

    // Calculate rest score (0-100)
    const restScore = Math.min(100, Math.round((totalRestMinutes / (7 * 60)) * 50 + (avgQuality / 10) * 50));

    // Calculate recovery rate based on activity types
    const activityTypes = new Set(weekActivities.map(r => r.type));
    const recoveryRate = Math.min(100, Math.round((activityTypes.size / 5) * 50 + (avgQuality / 10) * 50));

    // Generate recommendations
    const recommendations: string[] = [];
    if (totalRestMinutes < 7 * 30) {
      recommendations.push('Aim for at least 30 minutes of rest activities daily');
    }
    if (avgQuality < 6) {
      recommendations.push('Focus on quality over quantity in your rest activities');
    }
    if (activityTypes.size < 3) {
      recommendations.push('Try diversifying your rest activities for better recovery');
    }

    setMetrics({
      userId: user?.uid || '',
      totalRestTime: totalRestHours,
      restScore,
      recoveryRate,
      burnoutRisk: Math.max(0, 100 - restScore),
      recommendations,
      calculatedAt: new Date(),
    });
  };

  const addActivity = () => {
    if (!user) return;

    const activity: RestActivity = {
      id: `rest_${Date.now()}`,
      userId: user.uid,
      type: newActivity.type,
      timestamp: new Date(),
      duration: newActivity.duration,
      quality: newActivity.quality,
      notes: newActivity.notes || undefined,
      createdAt: new Date(),
    };

    const updated = [activity, ...activities];
    setActivities(updated);
    localStorage.setItem(`rest_activities_${user.uid}`, JSON.stringify(updated));
    calculateMetrics(updated);
    setShowAddActivity(false);
    setNewActivity({ type: 'meditation', duration: 15, quality: 7, notes: '' });
  };

  const getActivityIcon = (type: RestActivity['type']) => {
    const icons: Record<RestActivity['type'], string> = {
      meditation: '🧘',
      nap: '😴',
      walk: '🚶',
      reading: '📚',
      exercise: '💪',
      social: '👥',
      other: '✨',
    };
    return icons[type] || '✨';
  };

  const getActivityLabel = (type: RestActivity['type']) => {
    const labels: Record<RestActivity['type'], string> = {
      meditation: 'Meditation',
      nap: 'Nap',
      walk: 'Walk',
      reading: 'Reading',
      exercise: 'Exercise',
      social: 'Social Time',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Rest & Recovery</h2>
        <button
          onClick={() => setShowAddActivity(true)}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Log Activity
        </button>
      </div>

      {/* Recovery Metrics */}
      {metrics && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">This Week</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${getScoreBg(metrics.restScore)}`}>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rest Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(metrics.restScore)}`}>
                {metrics.restScore}/100
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Rest</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {metrics.totalRestTime}h
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <p className="text-sm text-gray-600 dark:text-gray-400">Recovery Rate</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {metrics.recoveryRate}%
              </p>
            </div>
            <div className={`p-4 rounded-lg ${getScoreBg(100 - metrics.burnoutRisk)}`}>
              <p className="text-sm text-gray-600 dark:text-gray-400">Burnout Risk</p>
              <p className={`text-2xl font-bold ${getScoreColor(100 - metrics.burnoutRisk)}`}>
                {metrics.burnoutRisk}%
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {metrics.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recommendations
              </h4>
              <div className="space-y-2">
                {metrics.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-indigo-500">💡</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Activities */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Activities</h3>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No rest activities yet. Log your activities to track recovery.
          </p>
        ) : (
          <div className="space-y-2">
            {activities.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {getActivityLabel(activity.type)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.duration} min
                  </p>
                  <p className={`text-xs ${getScoreColor(activity.quality * 10)}`}>
                    Quality: {activity.quality}/10
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Activity Modal */}
      {showAddActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Log Rest Activity
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Activity Type
                </label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as RestActivity['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="meditation">🧘 Meditation</option>
                  <option value="nap">😴 Nap</option>
                  <option value="walk">🚶 Walk</option>
                  <option value="reading">📚 Reading</option>
                  <option value="exercise">💪 Exercise</option>
                  <option value="social">👥 Social Time</option>
                  <option value="other">✨ Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={newActivity.duration}
                  onChange={(e) => setNewActivity({ ...newActivity, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quality (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newActivity.quality}
                  onChange={(e) => setNewActivity({ ...newActivity, quality: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={newActivity.notes}
                  onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="Any notes about your rest activity..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddActivity(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={addActivity}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Log Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

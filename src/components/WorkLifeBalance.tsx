'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { 
  calculateBalanceScore, 
  calculateTimeAllocation, 
  generateBalanceRecommendations,
  LIFE_CATEGORIES,
  BalanceScore,
  TimeAllocation 
} from '@/utils/workLifeBalance';

export default function WorkLifeBalance() {
  const { user } = useAuth();
  const { goals } = useGoals(user?.uid);
  const [balanceScore, setBalanceScore] = useState<BalanceScore | null>(null);
  const [timeAllocations, setTimeAllocations] = useState<TimeAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !goals) return;

    // Calculate time allocations from goals
    const logs = goals.map(goal => ({
      category: goal.category || 'personal',
      duration: goal.estimatedDuration || 30,
    }));

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    const allocations = calculateTimeAllocation(logs, startDate, endDate);
    setTimeAllocations(allocations);

    // Calculate balance score
    const score = calculateBalanceScore(allocations);
    setBalanceScore(score);
    setLoading(false);
  }, [user, goals]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!balanceScore) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Work-Life Balance</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Start tracking your tasks to see your work-life balance score.
        </p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Work-Life Balance</h2>
      
      {/* Overall Score */}
      <div className={`rounded-xl p-6 mb-6 ${getScoreBgColor(balanceScore.overall)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall Balance Score</p>
            <p className={`text-4xl font-bold ${getScoreColor(balanceScore.overall)}`}>
              {balanceScore.overall}/100
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl">{getTrendIcon(balanceScore.trend)}</span>
            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{balanceScore.trend}</p>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Time Allocation</h3>
        <div className="space-y-3">
          {timeAllocations.map((allocation) => {
            const category = LIFE_CATEGORIES.find(c => c.id === allocation.category);
            if (!category) return null;
            
            return (
              <div key={allocation.category} className="flex items-center gap-3">
                <span className="text-lg">{category.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {category.name}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {allocation.hours}h/week
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (allocation.hours / category.targetHoursPerWeek) * 100)}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      {balanceScore.insights.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Insights</h3>
          <div className="space-y-2">
            {balanceScore.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-yellow-500">💡</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {balanceScore.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recommendations</h3>
          <div className="space-y-2">
            {balanceScore.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-indigo-500">✨</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

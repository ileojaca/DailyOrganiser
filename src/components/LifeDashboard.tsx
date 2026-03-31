'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { useAccomplishmentLogs } from '@/hooks/useAccomplishmentLogs';
import type { BalanceScore, TimeAllocation, LifeCategory } from '@/types/lifeManagement';

const LIFE_CATEGORIES: LifeCategory[] = [
  { id: 'work', name: 'Work', color: '#3B82F6', icon: '💼', targetHoursPerWeek: 40, minHoursPerWeek: 35, maxHoursPerWeek: 50 },
  { id: 'family', name: 'Family', color: '#EC4899', icon: '👨‍👩‍👧‍👦', targetHoursPerWeek: 20, minHoursPerWeek: 15, maxHoursPerWeek: 30 },
  { id: 'health', name: 'Health & Fitness', color: '#10B981', icon: '💪', targetHoursPerWeek: 7, minHoursPerWeek: 4, maxHoursPerWeek: 14 },
  { id: 'personal', name: 'Personal Growth', color: '#8B5CF6', icon: '📚', targetHoursPerWeek: 7, minHoursPerWeek: 3, maxHoursPerWeek: 14 },
  { id: 'social', name: 'Social', color: '#F59E0B', icon: '👥', targetHoursPerWeek: 7, minHoursPerWeek: 3, maxHoursPerWeek: 14 },
  { id: 'rest', name: 'Rest & Recovery', color: '#06B6D4', icon: '😴', targetHoursPerWeek: 56, minHoursPerWeek: 49, maxHoursPerWeek: 63 },
];

export default function LifeDashboard() {
  const { user } = useAuth();
  const { goals } = useGoals(user?.uid);
  const { logs } = useAccomplishmentLogs(user?.uid);
  const [balanceScore, setBalanceScore] = useState<BalanceScore | null>(null);
  const [timeAllocations, setTimeAllocations] = useState<TimeAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !goals || !logs) return;

    // Calculate time allocations from logs
    const categoryHours: Record<string, number> = {};
    logs.forEach(log => {
      const goal = goals.find(g => g.id === log.goalId);
      if (goal) {
        const hours = (log.actualDuration || 0) / 60;
        categoryHours[goal.category] = (categoryHours[goal.category] || 0) + hours;
      }
    });

    // Calculate allocations
    const allocations: TimeAllocation[] = LIFE_CATEGORIES.map(category => {
      const hours = categoryHours[category.id] || 0;
      const hoursPerWeek = hours / 4; // Assuming 4 weeks of data
      const percentage = (hoursPerWeek / category.targetHoursPerWeek) * 100;
      const deviation = (hoursPerWeek - category.targetHoursPerWeek) / category.targetHoursPerWeek;

      return {
        category: category.id,
        hours: Math.round(hoursPerWeek * 10) / 10,
        percentage: Math.round(percentage),
        target: category.targetHoursPerWeek,
        deviation: Math.round(deviation * 100) / 100,
      };
    });

    setTimeAllocations(allocations);

    // Calculate balance score
    const categoryScores: Record<string, number> = {};
    allocations.forEach(allocation => {
      const deviation = Math.abs(allocation.deviation);
      let score = 100;
      if (deviation > 0.5) score = Math.max(0, 100 - (deviation * 100));
      categoryScores[allocation.category] = score;
    });

    const weights: Record<string, number> = {
      work: 0.25, family: 0.25, health: 0.15, personal: 0.15, social: 0.1, rest: 0.1,
    };

    let overallScore = 0;
    let totalWeight = 0;
    for (const [category, score] of Object.entries(categoryScores)) {
      const weight = weights[category] || 0.1;
      overallScore += score * weight;
      totalWeight += weight;
    }
    overallScore = totalWeight > 0 ? overallScore / totalWeight : 0;

    const insights: string[] = [];
    const recommendations: string[] = [];

    allocations.forEach(allocation => {
      const category = LIFE_CATEGORIES.find(c => c.id === allocation.category);
      if (allocation.deviation < -0.3) {
        insights.push(`${category?.name} is below target (${allocation.hours}h vs ${category?.targetHoursPerWeek}h)`);
        recommendations.push(`Consider allocating more time to ${category?.name.toLowerCase()}`);
      } else if (allocation.deviation > 0.3) {
        insights.push(`${category?.name} is above target (${allocation.hours}h vs ${category?.targetHoursPerWeek}h)`);
        recommendations.push(`Consider reducing time spent on ${category?.name.toLowerCase()}`);
      }
    });

    setBalanceScore({
      overall: Math.round(overallScore),
      categories: categoryScores,
      trend: 'stable',
      insights,
      recommendations,
      calculatedAt: new Date(),
    });

    setLoading(false);
  }, [user, goals, logs]);

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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Life Dashboard</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Start tracking your tasks to see your life balance score.
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Life Dashboard</h2>
      
      {/* Overall Score */}
      <div className={`rounded-xl p-6 mb-6 ${getScoreBgColor(balanceScore.overall)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall Life Balance</p>
            <p className={`text-4xl font-bold ${getScoreColor(balanceScore.overall)}`}>
              {balanceScore.overall}/100
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl">
              {balanceScore.trend === 'improving' ? '📈' : balanceScore.trend === 'declining' ? '📉' : '➡️'}
            </span>
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

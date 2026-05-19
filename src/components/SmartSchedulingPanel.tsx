'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Goal } from '@/hooks/useGoals';
import { generateOptimalDailySchedule, ScheduleOutput, ScheduledTask } from '@/utils/intelligentScheduler';

interface SmartSchedulingPanelProps {
  tasks: Goal[];
  currentEnergy: number;
  sleepHours: number;
  workLifeBalance?: { work: number; personal: number; health: number; learning: number };
  onScheduleGenerated?: (schedule: ScheduleOutput) => void;
  compact?: boolean;
}

const CATEGORY_EMOJI: Record<string, string> = {
  work: '💼',
  personal: '⭐',
  health: '🏃',
  learning: '📚',
  social: '👥',
  family: '👨‍👩‍👧',
};

export default function SmartSchedulingPanel({
  tasks,
  currentEnergy,
  sleepHours,
  workLifeBalance = { work: 40, personal: 30, health: 15, learning: 15 },
  onScheduleGenerated,
  compact = false,
}: SmartSchedulingPanelProps) {
  const [schedule, setSchedule] = useState<ScheduleOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(!compact);

  const generateSchedule = () => {
    setLoading(true);
    try {
      const output = generateOptimalDailySchedule({
        tasks,
        userEnergy: currentEnergy,
        sleepLastNight: sleepHours,
        workLifeBalance,
        workingHoursStart: 8,
        workingHoursEnd: 18,
        today: new Date(),
      });

      setSchedule(output);
      onScheduleGenerated?.(output);
    } finally {
      setLoading(false);
    }
  };

  const getEnergyColor = (level: number): string => {
    if (level <= 3) return 'text-red-600 bg-red-50';
    if (level <= 5) return 'text-yellow-600 bg-yellow-50';
    if (level <= 7) return 'text-blue-600 bg-blue-50';
    return 'text-green-600 bg-green-50';
  };

  const getSleepQuality = (hours: number): string => {
    if (hours < 5) return 'Poor - Very low sleep';
    if (hours < 6) return 'Fair - Sleep deprived';
    if (hours < 7) return 'Good - Slightly low';
    if (hours <= 9) return 'Excellent - Optimal range';
    return 'Fair - Too much sleep';
  };

  if (!compact && !schedule && tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Intelligent Daily Schedule</h2>
            <p className="text-xs text-gray-500 mt-1">Add tasks to generate an optimized schedule</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">Create tasks and I'll automatically plan your perfect day based on your energy, sleep, and goals.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Intelligent Daily Schedule</h2>
            {schedule && (
              <p className="text-xs text-gray-500 mt-1">{schedule.schedule.length} tasks optimized</p>
            )}
          </div>
          <button
            onClick={generateSchedule}
            disabled={loading || tasks.length === 0}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium disabled:opacity-50 transition-colors flex-shrink-0"
          >
            {loading ? 'Generating...' : schedule ? 'Regenerate' : 'Generate'}
          </button>
        </div>

        {!schedule && (
          <div className="flex flex-wrap gap-3 text-xs">
            <div className={`px-2.5 py-1.5 rounded-lg ${getEnergyColor(currentEnergy)}`}>
              ⚡ Energy: {currentEnergy}/10
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-600">
              😴 Sleep: {sleepHours}h — {getSleepQuality(sleepHours)}
            </div>
          </div>
        )}
      </div>

      {schedule ? (
        <>
          <div className="space-y-1">
            {schedule.schedule.slice(0, compact ? 3 : 5).map((item: ScheduledTask, idx: number) => (
              <div
                key={idx}
                className={`px-5 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  idx < (compact ? 3 : 5) - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''
                }`}
              >
                <div className="flex-shrink-0 text-xs font-semibold text-gray-500 w-20">
                  {item.scheduledStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {CATEGORY_EMOJI[item.category] || '📌'} {item.category} · {Math.round((item.scheduledEnd.getTime() - item.scheduledStart.getTime()) / 60000)}m
                  </p>
                </div>
                {!compact && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{item.reason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {schedule.schedule.length > (compact ? 3 : 5) && (
            <div className="px-5 py-2 text-center border-t border-gray-100 dark:border-gray-700">
              <Link href="/planner" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                View Full Day ({schedule.schedule.length - (compact ? 3 : 5)} more) →
              </Link>
            </div>
          )}

          {schedule.recommendations.length > 0 && showDetails && (
            <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">💡 Recommendations</p>
              <ul className="space-y-1">
                {schedule.recommendations.slice(0, 2).map((rec, idx) => (
                  <li key={idx} className="text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                    <span className="flex-shrink-0 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!compact && schedule.energyDistribution && (
            <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-2">⚡ Your Energy Pattern</p>
              <div className="space-y-2">
                {schedule.energyDistribution.peakHours.length > 0 && (
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-medium">Peak hours:</span> {schedule.energyDistribution.peakHours.slice(0, 3).join(', ')}
                  </p>
                )}
                {schedule.energyDistribution.goodHours.length > 0 && (
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-medium">Good hours:</span> {schedule.energyDistribution.goodHours.slice(0, 3).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : tasks.length > 0 ? (
        <div className="p-5 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Ready to optimize your day?</p>
          <button
            onClick={generateSchedule}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? 'Analyzing...' : 'Generate Intelligent Schedule'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

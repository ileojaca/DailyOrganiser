'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Goal } from '@/hooks/useGoals';
import { generateOptimalDailySchedule, ScheduleOutput, ScheduledTask } from '@/utils/intelligentScheduler';

interface OptimizedDayScheduleProps {
  tasks: Goal[];
  currentEnergy: number;
  sleepHours: number;
  onScheduleGenerated?: (schedule: ScheduleOutput) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  work: '💼',
  personal: '⭐',
  health: '🏃',
  learning: '📚',
  social: '👥',
  family: '👨‍👩‍👧',
};

export default function OptimizedDaySchedule({ tasks, currentEnergy, sleepHours, onScheduleGenerated }: OptimizedDayScheduleProps) {
  const [schedule, setSchedule] = useState<ScheduleOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSchedule = () => {
    setLoading(true);
    try {
      const output = generateOptimalDailySchedule({
        tasks,
        userEnergy: currentEnergy,
        sleepLastNight: sleepHours,
        workLifeBalance: {
          work: 40,
          personal: 30,
          health: 15,
          learning: 15,
        },
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

  useEffect(() => {
    if (tasks.length > 0) {
      generateSchedule();
    }
  }, []);

  if (!schedule) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Today's Optimized Schedule</h2>
            <p className="text-xs text-gray-500 mt-1">AI will plan your perfect day</p>
          </div>
          <button
            onClick={generateSchedule}
            disabled={loading || tasks.length === 0}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {tasks.length === 0 && <p className="text-xs text-gray-500">Add tasks to generate a schedule</p>}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Today's Optimized Schedule</h2>
            <p className="text-xs text-gray-500 mt-1">{schedule.schedule.length} tasks planned</p>
          </div>
          <button
            onClick={generateSchedule}
            disabled={loading}
            className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {schedule.schedule.length === 0 ? (
        <div className="p-5 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">No tasks scheduled for today</p>
          <Link href="/planner" className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 inline-block">
            View Planner →
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {schedule.schedule.slice(0, 4).map((item: ScheduledTask, idx: number) => (
              <div
                key={idx}
                className={`px-5 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${idx < schedule.schedule.slice(0, 4).length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}
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
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>

          {schedule.schedule.length > 4 && (
            <div className="px-5 py-2 text-center border-t border-gray-100 dark:border-gray-700">
              <Link href="/planner" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                View Full Day ({schedule.schedule.length - 4} more) →
              </Link>
            </div>
          )}

          {schedule.recommendations.length > 0 && (
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
        </>
      )}
    </div>
  );
}

'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import AppShell from '@/components/AppShell';
import DayViewCalendar from '@/components/DayViewCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function PlannerPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { goals, loading: goalsLoading } = useGoals(user?.uid);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const visibleTasks = goals.filter(g => {
    if (!g.scheduledStart) return false;
    const taskDate = new Date(g.scheduledStart);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === selectedDate.getTime();
  });

  const prevDay = () => setSelectedDate(addDays(selectedDate, -1));
  const nextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Schedule</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-planned tasks with time blocks</p>
          </div>
          <Link
            href="/assistant"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span className="text-sm font-medium">Ask AI to plan</span>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevDay}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatDateLabel(selectedDate)}
              </h2>
              {selectedDate.toDateString() === new Date().toDateString() && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Today</p>
              )}
            </div>

            <button
              onClick={nextDay}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {selectedDate.toDateString() !== new Date().toDateString() && (
            <button
              onClick={goToToday}
              className="w-full mb-4 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              Go to today
            </button>
          )}

          {goalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 text-sm">Loading...</div>
            </div>
          ) : (
            <DayViewCalendar
              date={selectedDate}
              tasks={goals}
              onTaskClick={() => {}}
            />
          )}

          {!goalsLoading && visibleTasks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">No tasks scheduled for this day</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Use the AI assistant to plan your day</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">How it works</h3>
          <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0">1</span>
              <span>Add tasks and set their duration in the task list</span>
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0">2</span>
              <span>Go to the AI assistant and ask it to "plan my day"</span>
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0">3</span>
              <span>Your schedule appears here with times and balance checks</span>
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0">4</span>
              <span>Follow your plan and check off tasks as you complete them</span>
            </li>
          </ol>
        </div>

      </div>
    </AppShell>
  );
}

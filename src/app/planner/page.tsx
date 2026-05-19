'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Bot } from 'lucide-react';
import AppShell from '@/components/AppShell';
import DayViewCalendar from '@/components/DayViewCalendar';
import WeekViewCalendar from '@/components/WeekViewCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { scheduleTaskReminder } from '@/lib/notificationScheduler';

type ViewMode = 'day' | 'week';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const startLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

export default function PlannerPage() {
  const { user } = useAuth();
  const { goals, loading: goalsLoading } = useGoals(user?.uid);

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));

  useEffect(() => {
    if (goalsLoading) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    goals.forEach((task) => {
      if (!task.scheduledStart) return;
      const start = new Date(task.scheduledStart as string | number | Date);
      if (start >= todayStart && start <= todayEnd) {
        scheduleTaskReminder(task.title, start);
      }
    });
  }, [goals, goalsLoading]);

  const visibleTasks = goals.filter(g => {
    if (!g.scheduledStart) return false;
    const taskDate = new Date(g.scheduledStart as string | number | Date);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === selectedDate.getTime();
  });

  const prevDay = () => setSelectedDate(addDays(selectedDate, -1));
  const nextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goToToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
    setWeekStart(getWeekStart(new Date()));
  };

  const isCurrentWeek = weekStart.getTime() === getWeekStart(new Date()).getTime();

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

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
          {/* View mode + navigation header */}
          <div className="flex items-center justify-between mb-4 gap-4">
            {/* View toggle */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex-shrink-0">
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'day'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Week
              </button>
            </div>

            {/* Date navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={viewMode === 'day' ? prevDay : prevWeek}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>

              <div className="text-center min-w-[160px]">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {viewMode === 'day' ? formatDateLabel(selectedDate) : formatWeekLabel(weekStart)}
                </h2>
                {viewMode === 'day' && selectedDate.toDateString() === new Date().toDateString() && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">Today</p>
                )}
                {viewMode === 'week' && isCurrentWeek && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">This week</p>
                )}
              </div>

              <button
                onClick={viewMode === 'day' ? nextDay : nextWeek}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Go to today button */}
          {(viewMode === 'day'
            ? selectedDate.toDateString() !== new Date().toDateString()
            : !isCurrentWeek
          ) && (
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
          ) : viewMode === 'day' ? (
            <>
              <DayViewCalendar
                date={selectedDate}
                tasks={goals}
                onTaskClick={() => {}}
              />
              {visibleTasks.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">No tasks scheduled for this day</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Use the AI assistant to plan your day</p>
                </div>
              )}
            </>
          ) : (
            <WeekViewCalendar
              weekStart={weekStart}
              tasks={goals}
              onDayClick={(date) => {
                setSelectedDate(date);
                setViewMode('day');
              }}
            />
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">How it works</h3>
          <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0">1</span>
              <span>Add tasks in the task list with estimated duration</span>
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0">2</span>
              <span>Go to the AI assistant and ask it to "plan my day" or "schedule for tomorrow"</span>
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0">3</span>
              <span>Switch between Day and Week views — click any week day to zoom in</span>
            </li>
            <li className="flex gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0">4</span>
              <span>Go to Tasks to mark items as Done when you complete them</span>
            </li>
          </ol>
        </div>

      </div>
    </AppShell>
  );
}

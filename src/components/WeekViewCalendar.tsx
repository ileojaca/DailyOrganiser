'use client';

import { useMemo } from 'react';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Task {
  id: string;
  title: string;
  scheduledStart?: Date | unknown;
  scheduledEnd?: Date | unknown;
  category?: string;
  status?: string;
}

interface WeekViewCalendarProps {
  weekStart: Date;
  tasks: Task[];
  onDayClick?: (date: Date) => void;
}

const CATEGORY_COLOR: Record<string, string> = {
  work: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  personal: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  health: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  learning: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
  family: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
  social: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
};

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') return new Date(val);
  if (typeof val === 'object' && 'toDate' in (val as object)) return (val as { toDate: () => Date }).toDate();
  return null;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function WeekViewCalendar({ weekStart, tasks, onDayClick }: WeekViewCalendarProps) {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    days.forEach(day => map.set(day.toDateString(), []));

    tasks.forEach(task => {
      const start = toDate(task.scheduledStart);
      if (!start) return;
      const key = start.toDateString();
      if (map.has(key)) {
        map.get(key)!.push(task);
      }
    });

    // Sort tasks by start time within each day
    map.forEach(dayTasks => {
      dayTasks.sort((a, b) => {
        const aStart = toDate(a.scheduledStart);
        const bStart = toDate(b.scheduledStart);
        if (!aStart || !bStart) return 0;
        return aStart.getTime() - bStart.getTime();
      });
    });

    return map;
  }, [tasks, days]);

  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-0 divide-x divide-gray-100 dark:divide-gray-700">
      {days.map(day => {
        const isToday = isSameDay(day, today);
        const dayKey = day.toDateString();
        const dayTasks = tasksByDay.get(dayKey) || [];

        return (
          <div
            key={dayKey}
            className="flex flex-col min-h-[200px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            onClick={() => onDayClick?.(day)}
          >
            {/* Day header */}
            <div className={`px-2 py-2 text-center border-b border-gray-100 dark:border-gray-700 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {DAY_ABBR[day.getDay()]}
              </p>
              <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                {day.getDate()}
              </p>
            </div>

            {/* Tasks */}
            <div className="flex-1 p-1 space-y-1 overflow-y-auto">
              {dayTasks.length === 0 && (
                <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center mt-4">—</p>
              )}
              {dayTasks.map(task => {
                const start = toDate(task.scheduledStart);
                const colorClass = CATEGORY_COLOR[task.category || ''] || 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300';
                return (
                  <div
                    key={task.id}
                    className={`rounded px-1.5 py-1 border text-[10px] font-medium leading-tight ${colorClass} ${task.status === 'completed' ? 'opacity-50 line-through' : ''}`}
                    title={task.title}
                  >
                    {start && <span className="block text-[9px] opacity-75 mb-0.5">{formatTime(start)}</span>}
                    <span className="line-clamp-2">{task.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

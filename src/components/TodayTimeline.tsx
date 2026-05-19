'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Goal } from '@/hooks/useGoals';

export interface TodayTimelineProps {
  tasks: Goal[];
  className?: string;
}

const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 23;
const TIMELINE_SPAN = TIMELINE_END_HOUR - TIMELINE_START_HOUR;

const categoryColors: Record<string, string> = {
  work: 'bg-blue-500 text-white',
  health: 'bg-green-500 text-white',
  personal: 'bg-purple-500 text-white',
  learning: 'bg-amber-500 text-white',
  family: 'bg-pink-500 text-white',
  social: 'bg-teal-500 text-white',
};

const categoryBorder: Record<string, string> = {
  work: 'border-blue-400',
  health: 'border-green-400',
  personal: 'border-purple-400',
  learning: 'border-amber-400',
  family: 'border-pink-400',
  social: 'border-teal-400',
};

function hourToPercent(hour: number, minutes: number = 0): number {
  const totalMinutes = (hour + minutes / 60 - TIMELINE_START_HOUR) / TIMELINE_SPAN;
  return Math.min(100, Math.max(0, totalMinutes * 100));
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

interface TaskBlock {
  task: Goal;
  left: number;
  width: number;
  startTime: Date;
  endTime: Date;
}

export default function TodayTimeline({ tasks, className = '' }: TodayTimelineProps) {
  const now = new Date();

  const nowPercent = useMemo(() => {
    return hourToPercent(now.getHours(), now.getMinutes());
  }, []);

  const taskBlocks = useMemo((): TaskBlock[] => {
    return tasks.map(task => {
      let startTime: Date;
      let endTime: Date;

      if (task.scheduledStart) {
        startTime = new Date(task.scheduledStart);
        if (task.scheduledEnd) {
          endTime = new Date(task.scheduledEnd);
        } else {
          endTime = new Date(startTime.getTime() + (task.estimatedDuration || 30) * 60 * 1000);
        }
      } else if (task.deadline) {
        endTime = new Date(task.deadline);
        startTime = new Date(endTime.getTime() - 30 * 60 * 1000);
      } else {
        return null;
      }

      const left = hourToPercent(startTime.getHours(), startTime.getMinutes());
      const endPercent = hourToPercent(endTime.getHours(), endTime.getMinutes());
      const width = Math.max(endPercent - left, 1.5);

      return { task, left, width, startTime, endTime };
    }).filter((b): b is TaskBlock => b !== null);
  }, [tasks]);

  const hourLabels = useMemo(() => {
    const labels = [];
    for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h += 2) {
      const pct = hourToPercent(h);
      const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
      labels.push({ pct, label });
    }
    return labels;
  }, []);

  if (tasks.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 ${className}`}>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Today's Timeline</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          No tasks scheduled yet — use the{' '}
          <Link href="/planner" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Planner
          </Link>{' '}
          to schedule tasks
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Today's Timeline</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatTime(now)}
        </span>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[600px]">
          <div className="relative h-16 bg-gray-100 dark:bg-gray-700/50 rounded-lg overflow-hidden">
            {hourLabels.map(({ pct, label }) => (
              <div
                key={label}
                className="absolute top-0 bottom-0 flex flex-col justify-end pointer-events-none"
                style={{ left: `${pct}%` }}
              >
                <div className="w-px h-full bg-gray-200 dark:bg-gray-600 opacity-60" />
              </div>
            ))}

            {nowPercent > 0 && nowPercent < 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{ left: `${nowPercent}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
              </div>
            )}

            {taskBlocks.map(({ task, left, width, startTime, endTime }) => (
              <div
                key={task.id}
                className={`absolute top-2 bottom-2 rounded flex items-center px-1.5 overflow-hidden border ${categoryColors[task.category] || 'bg-gray-500 text-white'} ${categoryBorder[task.category] || 'border-gray-400'} cursor-default group`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${task.title} · ${formatTime(startTime)} – ${formatTime(endTime)}`}
              >
                <span className="text-xs font-medium truncate leading-tight select-none">
                  {task.title}
                </span>
              </div>
            ))}
          </div>

          <div className="relative mt-1 h-4">
            {hourLabels.map(({ pct, label }) => (
              <span
                key={label}
                className="absolute text-xs text-gray-400 dark:text-gray-500 -translate-x-1/2"
                style={{ left: `${pct}%` }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {taskBlocks.map(({ task, startTime, endTime }) => (
          <div
            key={task.id}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs ${categoryColors[task.category]} ${categoryBorder[task.category]}`}
          >
            <span className="font-medium truncate max-w-[140px]">{task.title}</span>
            <span className="opacity-80 whitespace-nowrap">
              {formatTime(startTime)}–{formatTime(endTime)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

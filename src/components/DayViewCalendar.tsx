'use client';

import { useEffect, useRef, useMemo } from 'react';
import { Goal } from '@/hooks/useGoals';

interface DayViewCalendarProps {
  date: Date;
  tasks: Goal[];
  onTaskClick?: (task: Goal) => void;
  onSlotClick?: (hour: number, minute: number) => void;
}

const HOUR_START = 6;
const HOUR_END = 23;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOUR_HEIGHT = 64;
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const TOTAL_MINUTES = TOTAL_HOURS * 60;

const CATEGORY_COLORS: Record<string, string> = {
  work: 'bg-blue-500 text-white border-blue-600',
  health: 'bg-green-500 text-white border-green-600',
  personal: 'bg-violet-500 text-white border-violet-600',
  learning: 'bg-amber-500 text-white border-amber-600',
  family: 'bg-pink-500 text-white border-pink-600',
  social: 'bg-teal-500 text-white border-teal-600',
};

function formatHourLabel(hour: number): string {
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function minutesFromStart(date: Date): number {
  return (date.getHours() - HOUR_START) * 60 + date.getMinutes();
}

function topPercent(date: Date): string {
  const mins = minutesFromStart(date);
  return `${(mins / TOTAL_MINUTES) * 100}%`;
}

function heightPercent(start: Date, end: Date): string {
  const duration = (end.getTime() - start.getTime()) / 60000;
  const pct = (duration / TOTAL_MINUTES) * 100;
  return `${Math.max(pct, (24 / TOTAL_MINUTES) * 100)}%`;
}

export default function DayViewCalendar({ date, tasks, onTaskClick, onSlotClick }: DayViewCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const isToday = isSameDay(date, now);

  useEffect(() => {
    if (!scrollRef.current) return;
    const currentHour = now.getHours();
    const clampedHour = Math.min(Math.max(currentHour, HOUR_START), HOUR_END);
    const scrollTop = (clampedHour - HOUR_START) * HOUR_HEIGHT - HOUR_HEIGHT * 2;
    scrollRef.current.scrollTop = Math.max(0, scrollTop);
  }, []);

  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.scheduledStart) return false;
      const startDate = t.scheduledStart instanceof Date ? t.scheduledStart : new Date(t.scheduledStart);
      return isSameDay(startDate, date);
    });
  }, [tasks, date]);

  // Compute overlap columns so tasks that share time render side-by-side
  const taskLayout = useMemo(() => {
    type LayoutItem = { task: (typeof visibleTasks)[0]; col: number; cols: number };
    const items: LayoutItem[] = visibleTasks.map(t => ({ task: t, col: 0, cols: 1 }));

    // Sort by start time
    items.sort((a, b) => {
      const aStart = a.task.scheduledStart instanceof Date ? a.task.scheduledStart : new Date(a.task.scheduledStart!);
      const bStart = b.task.scheduledStart instanceof Date ? b.task.scheduledStart : new Date(b.task.scheduledStart!);
      return aStart.getTime() - bStart.getTime();
    });

    // Build collision groups
    const groups: LayoutItem[][] = [];
    for (const item of items) {
      const tStart = item.task.scheduledStart instanceof Date ? item.task.scheduledStart : new Date(item.task.scheduledStart!);
      const tEnd = item.task.scheduledEnd
        ? (item.task.scheduledEnd instanceof Date ? item.task.scheduledEnd : new Date(item.task.scheduledEnd))
        : new Date(tStart.getTime() + (item.task.estimatedDuration || 30) * 60000);

      let placed = false;
      for (const group of groups) {
        const groupEnd = group.reduce((maxEnd, g) => {
          const gEnd = g.task.scheduledEnd
            ? (g.task.scheduledEnd instanceof Date ? g.task.scheduledEnd : new Date(g.task.scheduledEnd))
            : new Date((g.task.scheduledStart instanceof Date ? g.task.scheduledStart : new Date(g.task.scheduledStart!)).getTime() + (g.task.estimatedDuration || 30) * 60000);
          return gEnd > maxEnd ? gEnd : maxEnd;
        }, new Date(0));

        if (tStart < groupEnd) {
          // overlaps this group — assign next available column
          const usedCols = new Set(group.map(g => g.col));
          let col = 0;
          while (usedCols.has(col)) col++;
          item.col = col;
          group.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        item.col = 0;
        groups.push([item]);
      }
    }

    // Set cols = max column count in each group
    for (const group of groups) {
      const maxCol = group.reduce((m, g) => Math.max(m, g.col), 0);
      group.forEach(g => { g.cols = maxCol + 1; });
    }

    return new Map(items.map(i => [i.task.id, { col: i.col, cols: i.cols }]));
  }, [visibleTasks]);

  const nowTop = useMemo(() => {
    if (!isToday) return null;
    const mins = minutesFromStart(now);
    if (mins < 0 || mins > TOTAL_MINUTES) return null;
    return `${(mins / TOTAL_MINUTES) * 100}%`;
  }, [isToday, now]);

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSlotClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMins = (y / TOTAL_HEIGHT) * TOTAL_MINUTES;
    const hour = Math.floor(totalMins / 60) + HOUR_START;
    const minute = Math.floor(totalMins % 60);
    onSlotClick(Math.min(hour, HOUR_END - 1), minute);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: '600px' }}
      >
        <div className="flex" style={{ height: `${TOTAL_HEIGHT}px`, minHeight: `${TOTAL_HEIGHT}px` }}>
          <div className="w-12 flex-shrink-0 relative select-none">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full flex items-start justify-end pr-2"
                style={{ top: `${((hour - HOUR_START) / TOTAL_HOURS) * 100}%`, height: `${HOUR_HEIGHT}px` }}
              >
                {hour < HOUR_END && (
                  <span className="text-[10px] text-gray-400 leading-none -mt-1.5">
                    {formatHourLabel(hour)}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex-1 relative border-l border-gray-100" onClick={handleColumnClick}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-gray-200"
                style={{ top: `${((hour - HOUR_START) / TOTAL_HOURS) * 100}%` }}
              />
            ))}

            {Array.from({ length: TOTAL_HOURS }, (_, i) => i).map((i) => (
              <div
                key={`half-${i}`}
                className="absolute w-full border-t border-gray-100"
                style={{ top: `${((i + 0.5) / TOTAL_HOURS) * 100}%` }}
              />
            ))}

            {nowTop !== null && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                style={{ top: nowTop }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
                <div className="flex-1 border-t-2 border-red-500" />
                <span className="text-[10px] text-red-500 font-medium ml-1 pr-1">Now</span>
              </div>
            )}

            {visibleTasks.map((task) => {
              const start = task.scheduledStart instanceof Date ? task.scheduledStart : new Date(task.scheduledStart!);
              const end = task.scheduledEnd
                ? (task.scheduledEnd instanceof Date ? task.scheduledEnd : new Date(task.scheduledEnd))
                : new Date(start.getTime() + (task.estimatedDuration || 30) * 60000);
              const colorClass = CATEGORY_COLORS[task.category] || 'bg-gray-500 text-white border-gray-600';
              const layout = taskLayout.get(task.id) ?? { col: 0, cols: 1 };
              const colW = 100 / layout.cols;
              const leftPct = layout.col * colW;
              const GAP = 2; // px gap between columns

              return (
                <div
                  key={task.id}
                  className={`absolute rounded border px-1.5 py-0.5 overflow-hidden cursor-pointer hover:opacity-90 z-10 ${colorClass}`}
                  style={{
                    top: topPercent(start),
                    height: heightPercent(start, end),
                    minHeight: '24px',
                    left: `calc(${leftPct}% + ${GAP}px)`,
                    width: `calc(${colW}% - ${GAP * 2}px)`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick?.(task);
                  }}
                >
                  <p className="text-xs font-medium truncate leading-tight">{task.title}</p>
                  <p className="text-[10px] opacity-80 leading-tight">
                    {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    {layout.cols > 1 && end && (
                      <span> – {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

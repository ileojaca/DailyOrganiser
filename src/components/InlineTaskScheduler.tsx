'use client';

import { useState } from 'react';
import { Goal } from '@/hooks/useGoals';

interface InlineTaskSchedulerProps {
  task: Goal;
  onSchedule: (scheduledStart: Date, scheduledEnd: Date) => void;
  onCancel: () => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

function getNextRoundHour(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return `${now.getHours().toString().padStart(2, '0')}:00`;
}

function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function InlineTaskScheduler({ task, onSchedule, onCancel }: InlineTaskSchedulerProps) {
  const [date, setDate] = useState(todayString());
  const [startTime, setStartTime] = useState(getNextRoundHour());
  const [duration, setDuration] = useState(task.estimatedDuration && DURATION_OPTIONS.includes(task.estimatedDuration) ? task.estimatedDuration : 30);

  const handleSchedule = () => {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = startTime.split(':').map(Number);
    const start = new Date(year, month - 1, day, hour, minute, 0, 0);
    const end = new Date(start.getTime() + duration * 60000);
    onSchedule(start, end);
  };

  return (
    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Start</label>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Duration</label>
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          {DURATION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d < 60 ? `${d} min` : `${d / 60} hr${d > 60 ? 's' : ''}`}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-1.5 pb-0.5">
        <button
          onClick={handleSchedule}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
        >
          Schedule
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

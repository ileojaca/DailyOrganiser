'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeBlocks, TimeBlock } from '@/hooks/useTimeBlocks';
import { useGoals } from '@/hooks/useGoals';
import { AdaptiveScheduler } from '@/utils/adaptiveScheduler';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ENERGY_COLORS: Record<string, string> = {
  high: 'bg-green-100 border-green-300 text-green-800',
  medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  low: 'bg-gray-100 border-gray-300 text-gray-700',
};

const BLOCK_TYPE_COLORS: Record<string, string> = {
  fixed: 'bg-blue-50 border-blue-200',
  flexible: 'bg-purple-50 border-purple-200',
  protected: 'bg-red-50 border-red-200',
};

const EMPTY_FORM = {
  name: '',
  blockType: 'flexible' as TimeBlock['blockType'],
  startTime: '09:00',
  endTime: '10:00',
  daysOfWeek: [1, 2, 3, 4, 5] as number[],
  energyLevel: 'medium' as TimeBlock['energyLevel'],
  isProtected: false,
};

export default function PlannerPage() {
  const { user } = useAuth();
  const { timeBlocks, loading, createTimeBlock, deleteTimeBlock } = useTimeBlocks(user?.uid);
  const { goals, loading: goalsLoading } = useGoals(user?.uid);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleInfo, setScheduleInfo] = useState<string>('');
  const [scheduledCount, setScheduledCount] = useState(0);
  const [unscheduledCount, setUnscheduledCount] = useState(0);

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day].sort(),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createTimeBlock(form);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTimeBlock(id);
    } finally {
      setDeletingId(null);
    }
  };

  // Group blocks by day
  const blocksByDay = DAYS.map((_, dayIdx) =>
    timeBlocks.filter((b) => b.daysOfWeek.includes(dayIdx))
  );

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const autoScheduleGoals = async () => {
    if (!goals || goals.length === 0) {
      setScheduleInfo('No goals available to schedule.');
      return;
    }

    const pendingGoals = goals.filter((goal) => goal.status !== 'completed');
    if (pendingGoals.length === 0) {
      setScheduleInfo('All goals are completed; nothing to schedule.');
      return;
    }

    setScheduling(true);
    setScheduleInfo('Generating AI schedule...');
    const scheduler = new AdaptiveScheduler();

    const tasks = pendingGoals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      estimatedDuration: goal.estimatedDuration || 60,
      priority: (goal.priority >= 4 ? 'high' : goal.priority >= 2 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      category: goal.category,
      energyRequired: (
        goal.energyRequired && goal.energyRequired >= 7
          ? 'high'
          : goal.energyRequired && goal.energyRequired >= 4
          ? 'medium'
          : 'low'
      ) as 'high' | 'medium' | 'low',
      deadline: goal.deadline,
    }));

    const availableSlots = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      availableSlots.push(...scheduler.generateDaySlots(day, 'intermediate'));
    }

    const plan = scheduler.schedule(tasks, availableSlots, {
      bufferTime: 15,
      maxTasksPerDay: 3,
      preferredWorkHours: { start: 9, end: 17 },
    });

    let scheduled = 0;
    for (const item of plan.scheduledTasks) {
      const goal = pendingGoals.find((g) => g.id === item.task.id);
      if (!goal) continue;
      const startTime = item.startTime;
      const endTime = item.endTime;
      const energyLevel = (goal.energyRequired && goal.energyRequired >= 7 ? 'high' : goal.energyRequired && goal.energyRequired >= 4 ? 'medium' : 'low') as 'high' | 'medium' | 'low';
      const blockInput = {
        name: `${goal.title} (AI)`,
        blockType: 'flexible' as const,
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        daysOfWeek: [startTime.getDay()],
        energyLevel,
        isProtected: false,
      };
      try {
        await createTimeBlock(blockInput);
        scheduled += 1;
      } catch (error) {
        console.error('Failed to create AI time block', blockInput, error);
      }
    }

    setScheduledCount(scheduled);
    setUnscheduledCount(plan.unscheduledTasks.length);
    setScheduleInfo(
      `AI-scheduled ${scheduled} tasks. ${plan.unscheduledTasks.length} tasks could not be scheduled (${plan.suggestions.join(' ')})`
    );
    setScheduling(false);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Weekly Planner</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your time blocks and schedule</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Time Block
          </button>
        </div>

        {/* Help banner */}
        {timeBlocks.length === 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <p className="text-sm text-amber-800"><strong>📅 How it works:</strong> Create time blocks (e.g., "Focus Time", "Team Meetings") and assign them to days. These help organize your week and sync with your goals.</p>
          </div>
        )}

        {/* AI auto schedule section */}
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 mb-4">
          <p className="text-sm text-green-700">Use AI Auto-Schedule to map your current goals into this week’s calendar.</p>
          <div className="mt-3 flex gap-2 items-center">
            <button
              onClick={autoScheduleGoals}
              disabled={scheduling || (goalsLoading && loading)}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
            >
              {scheduling ? 'Scheduling...' : 'AI Auto-Schedule Goals'}
            </button>
            <span className="text-xs text-gray-600">
              {scheduledCount > 0 && `Scheduled: ${scheduledCount}`}
              {unscheduledCount > 0 && ` | Unscheduled: ${unscheduledCount}`}
            </span>
          </div>
          {scheduleInfo && <p className="text-xs mt-2 text-green-800">{scheduleInfo}</p>}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">New Time Block</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Deep Work, Lunch, Exercise"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    value={form.blockType}
                    onChange={(e) => setForm((f) => ({ ...f, blockType: e.target.value as TimeBlock['blockType'] }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                  >
                    <option value="flexible">Flexible</option>
                    <option value="fixed">Fixed</option>
                    <option value="protected">Protected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day, idx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        form.daysOfWeek.includes(idx)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Energy Level</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, energyLevel: level }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${
                        form.energyLevel === level
                          ? ENERGY_COLORS[level] + ' ring-2 ring-indigo-400 ring-offset-1'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setForm(EMPTY_FORM); setShowForm(false); }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Block'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Weekly grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-3">
            {DAYS.map((day) => (
              <div key={day} className="space-y-2">
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 divide-x divide-gray-100">
              {DAYS.map((day, dayIdx) => (
                <div key={day} className="min-h-[400px]">
                  <div className={`px-2 py-3 text-center border-b border-gray-100 ${
                    dayIdx === new Date().getDay() ? 'bg-indigo-50' : ''
                  }`}>
                    <p className={`text-xs font-semibold ${
                      dayIdx === new Date().getDay() ? 'text-indigo-700' : 'text-gray-500'
                    }`}>{day}</p>
                    {dayIdx === new Date().getDay() && (
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full mx-auto mt-1" />
                    )}
                  </div>
                  <div className="p-1.5 space-y-1.5">
                    {blocksByDay[dayIdx].length === 0 ? (
                      <p className="text-[10px] text-gray-300 text-center pt-4">No blocks</p>
                    ) : (
                      blocksByDay[dayIdx]
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((block) => (
                          <div
                            key={block.id}
                            className={`rounded-lg border p-1.5 group relative ${BLOCK_TYPE_COLORS[block.blockType]}`}
                          >
                            <p className="text-[10px] font-semibold text-gray-800 truncate">{block.name}</p>
                            <p className="text-[9px] text-gray-500">{block.startTime}–{block.endTime}</p>
                            <span className={`inline-block mt-0.5 px-1 py-0.5 rounded text-[8px] font-medium ${ENERGY_COLORS[block.energyLevel]}`}>
                              {block.energyLevel}
                            </span>
                            <button
                              onClick={() => handleDelete(block.id)}
                              disabled={deletingId === block.id}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="font-medium">Block types:</span>
          {Object.entries({ fixed: 'Fixed', flexible: 'Flexible', protected: 'Protected' }).map(([type, label]) => (
            <span key={type} className={`px-2 py-1 rounded border ${BLOCK_TYPE_COLORS[type]}`}>{label}</span>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

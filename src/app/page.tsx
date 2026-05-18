'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import OnboardingFlow from '@/components/OnboardingFlow';
import LandingPage from '@/components/LandingPage';
import OptimizedDaySchedule from '@/components/OptimizedDaySchedule';
import TodayTimeline from '@/components/TodayTimeline';
import HabitStreaks from '@/components/HabitStreaks';
import EnergyTracker from '@/components/EnergyTracker';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { useNotifications } from '@/contexts/NotificationContext';
import { useGamification } from '@/hooks/useGamification';
import { useSleepAndEnergy } from '@/hooks/useSleepAndEnergy';

const PRIORITY_LABEL: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'Medium', 4: 'High', 5: 'Critical' };
const CATEGORY_EMOJI: Record<string, string> = { work: '💼', personal: '⭐', health: '🏃', learning: '📚', social: '👥', family: '👨‍👩‍👧' };

function priorityBarColor(priority: number): string {
  if (priority >= 5) return 'bg-red-500';
  if (priority >= 4) return 'bg-orange-400';
  if (priority >= 3) return 'bg-yellow-400';
  if (priority >= 2) return 'bg-blue-400';
  return 'bg-gray-300';
}

function priorityBadge(priority: number): string {
  if (priority >= 5) return 'bg-red-100 text-red-700';
  if (priority >= 4) return 'bg-orange-100 text-orange-700';
  if (priority >= 3) return 'bg-yellow-100 text-yellow-700';
  if (priority >= 2) return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-500';
}

function formatDeadline(deadline: Date): string {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  return `due in ${days}d`;
}

interface SmartMessageContext {
  hour: number;
  overdueTasks: { title: string }[];
  dueTodayTasks: { title: string }[];
  topTask: { title: string } | null;
  avgEnergy: number;
  completedToday: number;
}

function getSmartMessage(context: SmartMessageContext): { headline: string; detail: string; emoji: string; urgency: 'normal' | 'warning' | 'critical' } {
  const { hour, overdueTasks, dueTodayTasks, topTask, completedToday } = context;

  if (overdueTasks.length >= 3) return {
    emoji: '🚨',
    headline: `${overdueTasks.length} tasks are overdue`,
    detail: `Start with "${overdueTasks[0]?.title}" right now — it's most overdue.`,
    urgency: 'critical',
  };

  if (overdueTasks.length > 0) return {
    emoji: '⚠️',
    headline: `"${overdueTasks[0]?.title}" is overdue`,
    detail: `Complete it before taking on new work today.`,
    urgency: 'warning',
  };

  if (hour < 10 && topTask) return {
    emoji: '🌅',
    headline: `Morning focus: ${topTask.title}`,
    detail: `Your energy is at its peak now. Tackle your top priority first.`,
    urgency: 'normal',
  };

  if (hour >= 12 && hour < 14) return {
    emoji: '🍽️',
    headline: completedToday > 0 ? `${completedToday} done — enjoy lunch!` : 'Take a proper lunch break',
    detail: "Rest now, you'll be more productive afterwards.",
    urgency: 'normal',
  };

  if (hour >= 17 && dueTodayTasks.length > 0) return {
    emoji: '⏰',
    headline: `${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? 's' : ''} still due today`,
    detail: `Push to finish "${dueTodayTasks[0]?.title}" before you log off.`,
    urgency: 'warning',
  };

  if (completedToday >= 5) return {
    emoji: '🏆',
    headline: `Outstanding! ${completedToday} tasks completed`,
    detail: topTask ? `Consider tackling "${topTask.title}" too.` : "You're crushing it today!",
    urgency: 'normal',
  };

  if (topTask) return {
    emoji: '🎯',
    headline: `Focus: ${topTask.title}`,
    detail: `${dueTodayTasks.length} tasks due today. Start here.`,
    urgency: 'normal',
  };

  return {
    emoji: '✨',
    headline: 'All clear — great job!',
    detail: 'No urgent tasks. Add something new to keep momentum.',
    urgency: 'normal',
  };
}

export default function Home() {
  const { profile, user } = useAuth();
  const { goals, createGoal, updateGoal, completeGoal } = useGoals(user?.uid);
  const { addNotification } = useNotifications();
  const { progress: gamificationProgress } = useGamification();
  const { energy, sleep } = useSleepAndEnergy(user?.uid);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [alertsFired, setAlertsFired] = useState(false);
  const [quickTask, setQuickTask] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = profile?.fullName?.split(' ')[0] || 'there';
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const activeTasks = goals.filter(g => g.status === 'pending' || g.status === 'in_progress');
  const completedToday = goals.filter(g => {
    if (g.status !== 'completed' || !g.completedAt) return false;
    return new Date(g.completedAt) >= today;
  });

  const overdueTasks = activeTasks.filter(g => {
    if (!g.deadline) return false;
    return new Date(g.deadline) < today;
  });

  const dueTodayTasks = activeTasks.filter(g => {
    if (g.deadline) {
      const d = new Date(g.deadline);
      return d >= today && d < tomorrow;
    }
    if (g.scheduledStart) {
      const s = new Date(g.scheduledStart);
      return s >= today && s < tomorrow;
    }
    return false;
  });

  const topPriorityTask = [...activeTasks].sort((a, b) => b.priority - a.priority)[0] ?? null;

  const scheduledToday = activeTasks.filter(g => {
    if (!g.scheduledStart) return false;
    const s = new Date(g.scheduledStart);
    return s >= today && s < tomorrow;
  });

  const displayTasks = [...activeTasks]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8);

  const workLifeScore = useMemo(() => {
    const recent = goals.filter(g => {
      if (g.status !== 'completed' || !g.completedAt) return false;
      const days = (Date.now() - new Date(g.completedAt).getTime()) / (1000 * 60 * 60 * 24);
      return days <= 7;
    });
    if (recent.length === 0) return null;
    const workCount = recent.filter(g => g.category === 'work').length;
    const deviation = Math.abs(workCount / recent.length - 0.4);
    return Math.round(Math.max(0, 100 - deviation * 150));
  }, [goals]);

  const smartMsg = getSmartMessage({
    hour,
    overdueTasks,
    dueTodayTasks,
    topTask: topPriorityTask,
    avgEnergy: energy.currentLevel ?? 5,
    completedToday: completedToday.length,
  });

  useEffect(() => {
    if (!user || goals.length === 0 || alertsFired) return;
    setAlertsFired(true);

    if (overdueTasks.length > 0) {
      addNotification({
        type: 'warning',
        title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
        message: overdueTasks.slice(0, 2).map(t => t.title).join(', ') + (overdueTasks.length > 2 ? ` +${overdueTasks.length - 2} more` : ''),
      });
    }
    if (dueTodayTasks.length > 0) {
      addNotification({
        type: 'info',
        title: `${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? 's' : ''} due today`,
        message: dueTodayTasks.slice(0, 2).map(t => t.title).join(', '),
      });
    }
    if (completedToday.length >= 3) {
      addNotification({
        type: 'success',
        title: 'Great progress today!',
        message: `You've completed ${completedToday.length} tasks today. Keep it up!`,
      });
    }
  }, [user, goals.length, alertsFired]);

  useEffect(() => {
    const neverShow = localStorage.getItem('dailyOrganiserNeverShowOnboarding') === 'true';
    if (!neverShow && goals.length === 0) setShowOnboarding(true);
  }, [goals.length]);

  const completeOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('dailyOrganiserNeverShowOnboarding', 'true');
  };

  const handleQuickAdd = async () => {
    if (!quickTask.trim()) return;
    setAddingTask(true);
    try {
      await createGoal({ title: quickTask.trim(), category: 'personal', priority: 3, estimatedDuration: 30, energyRequired: 5 });
      setQuickTask('');
      addNotification({ type: 'success', title: 'Task added', message: `"${quickTask.trim()}" added to your list.` });
    } finally {
      setAddingTask(false);
    }
  };

  const handleTaskCircleClick = async (task: typeof activeTasks[0]) => {
    if (task.status === 'pending') {
      await updateGoal(task.id, { status: 'in_progress' });
    } else if (task.status === 'in_progress') {
      await completeGoal(task.id);
    }
  };

  if (!user) return <LandingPage />;

  if (goals.length === 0) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="mb-8 text-center">
            <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>👋</div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Welcome to DailyOrganiser</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Get organized, stay focused, and crush your goals.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-accent/30 transition-all cursor-default">
              <p className="text-3xl mb-2">📝</p>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Create Tasks</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add goals and track progress</p>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-accent/30 transition-all cursor-default">
              <p className="text-3xl mb-2">⏱️</p>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Focus Sessions</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Deep work with the Pomodoro timer</p>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-accent/30 transition-all cursor-default">
              <p className="text-3xl mb-2">🧠</p>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">AI Insights</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Get smart recommendations and briefings</p>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md hover:border-accent/30 transition-all cursor-default">
              <p className="text-3xl mb-2">💤</p>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Track Health</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Monitor sleep, energy, and habits</p>
            </div>
          </div>

          <div className="text-center mb-6">
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder="Add a task..."]') as HTMLInputElement;
                if (input) input.focus();
              }}
              className="px-8 py-3 font-semibold text-white rounded-xl hover:opacity-90 transition-opacity shadow-lg"
              style={{ background: 'var(--accent-color)' }}
            >
              Create Your First Task
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">Or explore the app using the menu below</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto xl:grid xl:grid-cols-3 xl:gap-6 xl:px-6 xl:py-6 min-h-screen">

        {/* Main column */}
        <div className="xl:col-span-2">

          {/* Greeting */}
          <div className="px-4 pt-6 pb-4">
            <p className="text-sm font-medium text-gray-500">{todayLabel}</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{greeting}, {name} 👋</h1>
            {completedToday.length > 0 && (
              <p className="text-sm text-green-600 mt-1">✓ {completedToday.length} task{completedToday.length > 1 ? 's' : ''} done today</p>
            )}
          </div>

          {/* Alert banner */}
          {overdueTasks.length > 0 && (
            <div className="mx-4 mb-4 flex items-center gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{overdueTasks.length} task{overdueTasks.length > 1 ? 's' : ''} overdue</p>
              <Link href="/tasks" className="ml-auto text-xs text-red-600 font-medium">View →</Link>
            </div>
          )}

          {/* Today's Focus card */}
          {topPriorityTask && (
            <div
              className="mx-4 mb-4 rounded-2xl p-5 text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, black))' }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">Today&apos;s Focus</p>
              <p className="text-lg font-bold leading-snug mb-3">{topPriorityTask.title}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/80 text-sm">
                  {topPriorityTask.estimatedDuration && <span>⏱ {topPriorityTask.estimatedDuration}m</span>}
                  <span>{PRIORITY_LABEL[topPriorityTask.priority] || 'Medium'} priority</span>
                </div>
                <Link
                  href="/focus"
                  className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Start →
                </Link>
              </div>
            </div>
          )}

          {/* Stats pills */}
          <div className="flex gap-2 px-4 mb-5 overflow-x-auto pb-1">
            <div className="flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full px-3 py-1.5 shadow-sm">
              <span className="text-sm font-bold text-gray-900 dark:text-white">{activeTasks.length}</span>
              <span className="text-xs text-gray-500">active</span>
            </div>
            <div className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-sm ${overdueTasks.length > 0 ? 'bg-red-50 border border-red-100' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}`}>
              <span className={`text-sm font-bold ${overdueTasks.length > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{overdueTasks.length}</span>
              <span className="text-xs text-gray-500">overdue</span>
            </div>
            {gamificationProgress && (
              <div className="flex-shrink-0 flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-full px-3 py-1.5 shadow-sm">
                <span className="text-sm">🔥</span>
                <span className="text-sm font-bold text-amber-700">{gamificationProgress.currentStreak}</span>
                <span className="text-xs text-amber-600">day streak</span>
              </div>
            )}
            {workLifeScore !== null && (
              <div className="flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full px-3 py-1.5 shadow-sm">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{workLifeScore}</span>
                <span className="text-xs text-gray-500">balance</span>
              </div>
            )}
          </div>

          {/* Quick add */}
          <form onSubmit={e => { e.preventDefault(); handleQuickAdd(); }} className="mx-4 mb-5">
            <div className="flex gap-2">
              <input
                type="text"
                value={quickTask}
                onChange={e => setQuickTask(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent shadow-sm"
                style={{ '--tw-ring-color': 'color-mix(in srgb, var(--accent-color) 30%, transparent)' } as React.CSSProperties}
              />
              <button
                type="submit"
                disabled={!quickTask.trim() || addingTask}
                className="w-11 h-11 flex items-center justify-center text-white rounded-xl font-bold text-lg disabled:opacity-40 shadow-sm flex-shrink-0 transition-opacity"
                style={{ background: 'var(--accent-color)' }}
              >
                +
              </button>
            </div>
          </form>

          {/* Optimized Schedule */}
          <div className="px-4 mb-4">
            <OptimizedDaySchedule tasks={activeTasks} currentEnergy={energy.currentLevel} sleepHours={sleep.lastNightHours} />
          </div>

          {/* Task section */}
          <div className="flex items-center justify-between px-4 mb-2 mt-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today&apos;s Tasks</h2>
            <Link href="/tasks" className="text-xs font-medium" style={{ color: 'var(--accent-color)' }}>See all →</Link>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl mx-4 mb-4 overflow-hidden shadow-sm">
            {displayTasks.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No active tasks — great job! 🎉</div>
            ) : (
              displayTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${idx < displayTasks.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}
                >
                  <div className={`w-1 h-10 rounded-full flex-shrink-0 ${priorityBarColor(task.priority)}`} />
                  <button
                    onClick={() => handleTaskCircleClick(task)}
                    className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-accent flex-shrink-0 flex items-center justify-center transition-colors"
                    style={{ borderColor: task.status === 'in_progress' ? 'var(--accent-color)' : undefined }}
                  >
                    {task.status === 'in_progress' && (
                      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-color)' }} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{CATEGORY_EMOJI[task.category] || '📌'} {task.category}</span>
                      {task.estimatedDuration && <span className="text-xs text-gray-400">· {task.estimatedDuration}m</span>}
                      {task.deadline && (
                        <span className={`text-xs font-medium ${task.deadline < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                          · {formatDeadline(task.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${priorityBadge(task.priority)}`}>
                    {PRIORITY_LABEL[task.priority] || 'Medium'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Timeline */}
          {scheduledToday.length > 0 && (
            <div className="px-4 mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Today&apos;s Schedule</h2>
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                <TodayTimeline tasks={scheduledToday} />
              </div>
            </div>
          )}

          {/* Habits */}
          <div className="px-4 mb-6">
            <HabitStreaks />
          </div>
        </div>

        {/* Desktop right sidebar */}
        <div className="hidden xl:block space-y-4">
          {gamificationProgress && (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Your Progress</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)', color: 'var(--accent-color)' }}
                >
                  Lvl {gamificationProgress.level}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">🔥{gamificationProgress.currentStreak}</p>
                  <p className="text-xs text-gray-500">day streak</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{gamificationProgress.totalPoints.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <EnergyTracker />
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Quick Links</h3>
            <div className="space-y-1">
              {[
                { href: '/sleep', emoji: '🌙', label: 'Sleep Tracker' },
                { href: '/energy', emoji: '⚡', label: 'Energy Tracker' },
                { href: '/family', emoji: '👨‍👩‍👧', label: 'Family Hub' },
                { href: '/planner', emoji: '📅', label: 'Planner' },
                { href: '/insights', emoji: '📊', label: 'Insights' },
              ].map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <span className="text-base">{l.emoji}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{l.label}</span>
                  <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showOnboarding && <OnboardingFlow onComplete={completeOnboarding} />}
    </AppShell>
  );
}

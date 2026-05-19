'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle, AlertTriangle, Info, Target, Clock, Briefcase, Star, Activity,
  BookOpen, Users, Heart, FileText, Bot, Calendar, ChevronRight, Moon,
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import OnboardingFlow from '@/components/OnboardingFlow';
import LandingPage from '@/components/LandingPage';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { useNotifications } from '@/contexts/NotificationContext';
import { useSleepAndEnergy } from '@/hooks/useSleepAndEnergy';
import { scheduleTaskReminder } from '@/lib/notificationScheduler';

const PRIORITY_LABEL: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'Medium', 4: 'High', 5: 'Critical' };

const CATEGORY_INFO: Record<string, { label: string; icon: any; color: string }> = {
  work: { label: 'Work', icon: Briefcase, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  personal: { label: 'Personal', icon: Star, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  health: { label: 'Health', icon: Activity, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  learning: { label: 'Learning', icon: BookOpen, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  social: { label: 'Social', icon: Users, color: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20' },
  family: { label: 'Family', icon: Heart, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
};

function CategoryIcon({ category }: { category: string }) {
  const cls = 'w-3 h-3 inline-block';
  switch (category) {
    case 'work': return <Briefcase className={cls} />;
    case 'personal': return <Star className={cls} />;
    case 'health': return <Activity className={cls} />;
    case 'learning': return <BookOpen className={cls} />;
    case 'social': return <Users className={cls} />;
    case 'family': return <Heart className={cls} />;
    default: return <FileText className={cls} />;
  }
}

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
  completedToday: number;
}

function getSmartMessage(context: SmartMessageContext): { headline: string; detail: string; urgency: 'normal' | 'warning' | 'critical' } {
  const { hour, overdueTasks, dueTodayTasks, topTask, completedToday } = context;

  if (overdueTasks.length >= 3) return {
    headline: `${overdueTasks.length} tasks are overdue`,
    detail: `Start with "${overdueTasks[0]?.title}" right now — it's most overdue.`,
    urgency: 'critical',
  };

  if (overdueTasks.length > 0) return {
    headline: `"${overdueTasks[0]?.title}" is overdue`,
    detail: `Complete it before taking on new work today.`,
    urgency: 'warning',
  };

  if (hour < 10 && topTask) return {
    headline: `Morning focus: ${topTask.title}`,
    detail: `Your energy is at its peak now. Tackle your top priority first.`,
    urgency: 'normal',
  };

  if (hour >= 12 && hour < 14) return {
    headline: completedToday > 0 ? `${completedToday} done — enjoy lunch!` : 'Take a proper lunch break',
    detail: "Rest now, you'll be more productive afterwards.",
    urgency: 'normal',
  };

  if (hour >= 17 && dueTodayTasks.length > 0) return {
    headline: `${dueTodayTasks.length} task${dueTodayTasks.length > 1 ? 's' : ''} still due today`,
    detail: `Push to finish "${dueTodayTasks[0]?.title}" before you log off.`,
    urgency: 'warning',
  };

  if (completedToday >= 5) return {
    headline: `Outstanding! ${completedToday} tasks completed`,
    detail: topTask ? `Consider tackling "${topTask.title}" too.` : "You're crushing it today!",
    urgency: 'normal',
  };

  if (topTask) return {
    headline: `Focus: ${topTask.title}`,
    detail: `${dueTodayTasks.length} tasks due today. Start here.`,
    urgency: 'normal',
  };

  return {
    headline: 'All clear — great job!',
    detail: 'No urgent tasks. Add something new to keep momentum.',
    urgency: 'normal',
  };
}

export default function Home() {
  const { profile, user } = useAuth();
  const { goals, createGoal, updateGoal, completeGoal } = useGoals(user?.uid);
  const { addNotification } = useNotifications();
  const { updateSleep } = useSleepAndEnergy(user?.uid);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [alertsFired, setAlertsFired] = useState(false);
  const [quickTask, setQuickTask] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [sleepHours, setSleepHours] = useState<number>(7);
  const [savingSleep, setSavingSleep] = useState(false);

  const hour = new Date().getHours();
  const name = profile?.fullName?.split(' ')[0] || 'there';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeTasks = goals.filter(g => g.status === 'pending' || g.status === 'in_progress');
  const completedToday = goals.filter(g => {
    if (g.status !== 'completed' || !g.completedAt) return false;
    return new Date(g.completedAt) >= today;
  });

  const completedWeek = goals.filter(g => {
    if (g.status !== 'completed' || !g.completedAt) return false;
    return new Date(g.completedAt) >= sevenDaysAgo;
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

  const displayTasks = [...activeTasks]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8);

  const scheduledTasksToday = activeTasks
    .filter(g => g.scheduledStart && new Date(g.scheduledStart) >= today && new Date(g.scheduledStart) < tomorrow)
    .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());

  const weeklyBalance = useMemo(() => {
    const breakdown: Record<string, number> = {};
    Object.keys(CATEGORY_INFO).forEach(cat => breakdown[cat] = 0);
    completedWeek.forEach(task => {
      breakdown[task.category]++;
    });
    return breakdown;
  }, [completedWeek]);

  const smartMsg = getSmartMessage({
    hour,
    overdueTasks,
    dueTodayTasks,
    topTask: topPriorityTask,
    completedToday: completedToday.length,
  });

  const handleSleepUpdate = async (value: number) => {
    setSleepHours(value);
    setSavingSleep(true);
    try {
      await updateSleep(value);
    } finally {
      setSavingSleep(false);
    }
  };

  // Schedule browser notifications for today's tasks
  useEffect(() => {
    if (!user || goals.length === 0) return;
    scheduledTasksToday.forEach(task => {
      if (task.scheduledStart) {
        scheduleTaskReminder(task.title, new Date(task.scheduledStart));
      }
    });
  }, [scheduledTasksToday.length]);

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
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--accent-color)' }}
            >
              <Target className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Welcome, {name}!</h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Get organized, stay balanced, and achieve your goals.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all cursor-default">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Create Goals</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Track your progress daily</p>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all cursor-default">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                <Bot className="w-5 h-5 text-purple-500" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">AI Planning</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Smart scheduling with balance awareness</p>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all cursor-default">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5 text-green-500" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Visual Calendar</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">See your day at a glance</p>
            </div>
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all cursor-default">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
                <Moon className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Sleep & Balance</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Track wellness and work-life balance</p>
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

        <div className="xl:col-span-2">

          <div className={`mx-4 mt-4 mb-3 p-4 rounded-2xl ${
            smartMsg.urgency === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
            smartMsg.urgency === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' :
            'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm'
          }`}>
            <div className="flex items-start gap-3">
              {smartMsg.urgency === 'critical' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
              {smartMsg.urgency === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />}
              {smartMsg.urgency === 'normal' && <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${
                  smartMsg.urgency === 'critical' ? 'text-red-700 dark:text-red-400' :
                  smartMsg.urgency === 'warning' ? 'text-amber-700 dark:text-amber-400' :
                  'text-gray-900 dark:text-white'
                }`}>{smartMsg.headline}</p>
                <p className={`text-xs mt-0.5 ${
                  smartMsg.urgency === 'critical' ? 'text-red-600 dark:text-red-300' :
                  smartMsg.urgency === 'warning' ? 'text-amber-600 dark:text-amber-300' :
                  'text-gray-500 dark:text-gray-400'
                }`}>{smartMsg.detail}</p>
              </div>
              <Link href="/assistant" className="flex-shrink-0 text-xs font-medium" style={{ color: 'var(--accent-color)' }}>Ask AI →</Link>
            </div>
          </div>

          <div className="flex gap-3 px-4 mb-5 overflow-x-auto pb-1">
            <div className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm">
              <Moon className="w-4 h-4 text-indigo-500" />
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min="3"
                  max="12"
                  value={sleepHours}
                  onChange={e => handleSleepUpdate(Number(e.target.value))}
                  className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{sleepHours}h</span>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full px-3 py-2 shadow-sm">
              <span className="text-sm font-bold text-gray-900 dark:text-white">{activeTasks.length}</span>
              <span className="text-xs text-gray-500">active</span>
            </div>
            {overdueTasks.length > 0 && (
              <div className="flex-shrink-0 flex items-center gap-1.5 bg-red-50 border border-red-100 dark:bg-red-900/20 dark:border-red-900 rounded-full px-3 py-2 shadow-sm">
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{overdueTasks.length}</span>
                <span className="text-xs text-red-600 dark:text-red-400">overdue</span>
              </div>
            )}
            {completedToday.length > 0 && (
              <div className="flex-shrink-0 flex items-center gap-1.5 bg-green-50 border border-green-100 dark:bg-green-900/20 dark:border-green-900 rounded-full px-3 py-2 shadow-sm">
                <span className="text-sm font-bold text-green-600 dark:text-green-400">{completedToday.length}</span>
                <span className="text-xs text-green-600 dark:text-green-400">completed</span>
              </div>
            )}
          </div>

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

          {scheduledTasksToday.length > 0 && (
            <>
              <div className="flex items-center justify-between px-4 mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today&apos;s Schedule</h2>
                <Link href="/planner?view=calendar" className="text-xs font-medium" style={{ color: 'var(--accent-color)' }}>View calendar →</Link>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl mx-4 mb-6 overflow-hidden shadow-sm">
                {scheduledTasksToday.map((task, idx) => {
                  const start = new Date(task.scheduledStart!);
                  const end = task.scheduledEnd ? new Date(task.scheduledEnd) : new Date(start.getTime() + (task.estimatedDuration || 30) * 60000);
                  const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  const endStr = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${idx < scheduledTasksToday.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}
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
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{timeStr} – {endStr}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${priorityBadge(task.priority)}`}>
                        {PRIORITY_LABEL[task.priority] || 'Medium'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today&apos;s Tasks</h2>
            <Link href="/tasks" className="text-xs font-medium" style={{ color: 'var(--accent-color)' }}>See all →</Link>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl mx-4 mb-6 overflow-hidden shadow-sm">
            {displayTasks.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">No active tasks — great job!</div>
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
                      <span className="text-xs text-gray-400 flex items-center gap-1"><CategoryIcon category={task.category} /> {task.category}</span>
                      {task.estimatedDuration && <span className="text-xs text-gray-400">· {task.estimatedDuration}m</span>}
                      {task.deadline && (
                        <span className={`text-xs font-medium ${new Date(task.deadline) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                          · {formatDeadline(new Date(task.deadline))}
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
        </div>

        <div className="hidden xl:block space-y-4">
          {completedWeek.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">This Week's Balance</h3>
              <div className="space-y-2.5">
                {Object.entries(weeklyBalance).map(([category, count]) => {
                  const total = completedWeek.length;
                  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                  const info = CATEGORY_INFO[category];
                  const Icon = info.icon;
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: info.color.split(' ')[0].replace('text-', '') }} />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{info.label}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${info.color.split(' ')[1]}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">{completedWeek.length} tasks completed</p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Navigation</h3>
            <div className="space-y-1">
              {[
                { href: '/tasks', icon: <Target className="w-4 h-4" />, label: 'All Tasks' },
                { href: '/assistant', icon: <Bot className="w-4 h-4" />, label: 'AI Assistant' },
                { href: '/planner', icon: <Calendar className="w-4 h-4" />, label: 'Planner' },
                { href: '/settings', icon: <Briefcase className="w-4 h-4" />, label: 'Settings' },
              ].map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <span className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">{l.icon}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{l.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 ml-auto" />
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

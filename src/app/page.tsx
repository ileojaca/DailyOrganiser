'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import TaskDashboard from '@/components/TaskDashboard';
import EnergyTracker from '@/components/EnergyTracker';
import HabitStreaks from '@/components/HabitStreaks';
import OnboardingFlow from '@/components/OnboardingFlow';
import LandingPage from '@/components/LandingPage';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { useNotifications } from '@/contexts/NotificationContext';

export default function Home() {
  const { profile, user } = useAuth();
  const { goals, createGoal } = useGoals(user?.uid);
  const { addNotification } = useNotifications();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [alertsFired, setAlertsFired] = useState(false);
  const [quickTask, setQuickTask] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = profile?.fullName?.split(' ')[0] || 'there';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // — Real computed metrics —
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

  const urgentTasks = activeTasks
    .filter(g => g.priority >= 4)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);

  // Real work-life score (0-100)
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

  // Proactive alerts — fire once per session
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

  // Onboarding
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

  if (!user) return <LandingPage />;

  const priorityLabel: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'Medium', 4: 'High', 5: 'Critical' };
  const categoryEmoji: Record<string, string> = { work: '💼', personal: '⭐', health: '🏃', learning: '📚', social: '👥', family: '👨‍👩‍👧' };

  return (
    <AppShell>
      <div className="min-h-screen py-6 px-4 lg:px-8 max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {greeting}, {name} 👋
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {completedToday.length > 0 && ` · ${completedToday.length} task${completedToday.length > 1 ? 's' : ''} done today`}
            </p>
          </div>
          <Link href="/assistant" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Assistant
          </Link>
        </div>

        {/* ── Proactive alert banners ── */}
        {overdueTasks.length > 0 && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <span className="text-red-500 text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400 text-sm">
                {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                {overdueTasks.slice(0, 3).map(t => t.title).join(' · ')}
              </p>
            </div>
          </div>
        )}
        {dueTodayTasks.length > 0 && (
          <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <span className="text-amber-500 text-lg flex-shrink-0">⏰</span>
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm">
                {dueTodayTasks.length} task{dueTodayTasks.length > 1 ? 's' : ''} due today
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
                {dueTodayTasks.slice(0, 3).map(t => t.title).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* ── Real stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active Tasks</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{activeTasks.length}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{completedToday.length} done today</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overdue</p>
            <p className={`text-3xl font-bold mt-1 ${overdueTasks.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {overdueTasks.length}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {overdueTasks.length === 0 ? 'All on track' : 'Need attention'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Due Today</p>
            <p className={`text-3xl font-bold mt-1 ${dueTodayTasks.length > 0 ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
              {dueTodayTasks.length}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">scheduled for today</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Work-Life Score</p>
            <p className={`text-3xl font-bold mt-1 ${
              workLifeScore === null ? 'text-gray-400' :
              workLifeScore >= 70 ? 'text-green-500' :
              workLifeScore >= 50 ? 'text-amber-500' : 'text-red-500'
            }`}>
              {workLifeScore === null ? '—' : `${workLifeScore}`}
              <span className="text-sm font-normal text-gray-400">/100</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {workLifeScore === null ? 'Complete tasks to score' : workLifeScore >= 70 ? 'Well balanced' : 'Needs adjustment'}
            </p>
          </div>
        </div>

        {/* ── Quick add task ── */}
        <div className="mb-6">
          <form
            onSubmit={e => { e.preventDefault(); handleQuickAdd(); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={quickTask}
              onChange={e => setQuickTask(e.target.value)}
              placeholder="Quick add a task — type and press Enter..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={addingTask || !quickTask.trim()}
              className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {addingTask ? '...' : '+ Add'}
            </button>
          </form>
        </div>

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left — tasks + priority ── */}
          <div className="xl:col-span-2 space-y-6">

            {/* Today's priorities */}
            {urgentTasks.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 dark:text-white">Today's Priorities</h2>
                  <Link href="/focus" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Start Focus →</Link>
                </div>
                <div className="space-y-2">
                  {urgentTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <span className="text-lg">{categoryEmoji[task.category] || '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {task.estimatedDuration ? `${task.estimatedDuration}m` : ''}{task.deadline ? ` · due ${new Date(task.deadline).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        task.priority >= 5 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        task.priority >= 4 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {priorityLabel[task.priority] || 'Medium'}
                      </span>
                      <Link href="/focus" className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title="Start focus session">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full task list */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <TaskDashboard />
            </div>

            {/* Habits */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <HabitStreaks />
            </div>
          </div>

          {/* Right — assistant shortcuts + energy ── */}
          <div className="space-y-6">

            {/* Quick navigation cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: '/focus', label: 'Focus Timer', emoji: '⏱', desc: 'Start a session', color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' },
                { href: '/assistant', label: 'AI Advice', emoji: '🧠', desc: 'Personal insights', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' },
                { href: '/sleep', label: 'Sleep', emoji: '🌙', desc: 'Log your rest', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
                { href: '/family', label: 'Family', emoji: '👨‍👩‍👧', desc: 'Connections', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
              ].map(card => (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`flex flex-col p-4 rounded-xl border ${card.color} hover:scale-[1.02] transition-transform`}
                >
                  <span className="text-2xl mb-1">{card.emoji}</span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{card.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{card.desc}</p>
                </Link>
              ))}
            </div>

            {/* Energy tracker */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <EnergyTracker />
            </div>

            {/* Quick links */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { href: '/planner', label: 'Weekly Planner', desc: 'View your schedule' },
                  { href: '/insights', label: 'Productivity Stats', desc: 'Charts & analytics' },
                  { href: '/work-life-balance', label: 'Work-Life Balance', desc: 'Balance tracker' },
                  { href: '/settings', label: 'Settings & AI Model', desc: 'Configure the app' },
                ].map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{link.label}</p>
                      <p className="text-xs text-gray-400">{link.desc}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOnboarding && <OnboardingFlow onComplete={completeOnboarding} />}
    </AppShell>
  );
}

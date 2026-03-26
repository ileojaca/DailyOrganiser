'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals, Goal } from '@/hooks/useGoals';

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'Minimal', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  2: { label: 'Low', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  3: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  4: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  5: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

const CATEGORY_ICONS: Record<string, string> = {
  work: '💼', personal: '🏠', health: '💪', learning: '📚', social: '👥',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Done', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  deferred: { label: 'Deferred', color: 'bg-purple-100 text-purple-700' },
};

type FilterType = 'all' | 'pending' | 'in_progress' | 'completed';
type SortType = 'priority' | 'scheduled' | 'created';

export default function TaskDashboard() {
  const { user } = useAuth();
  const { goals, loading, updateGoal, deleteGoal, completeGoal } = useGoals(user?.uid);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('priority');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleStatusToggle = async (goal: Goal) => {
    if (goal.status === 'completed') {
      await updateGoal(goal.id, { status: 'pending', completedAt: undefined });
    } else if (goal.status === 'pending') {
      await updateGoal(goal.id, { status: 'in_progress' });
    } else if (goal.status === 'in_progress') {
      await completeGoal(goal.id);
    }
  };

  const handleDelete = async (goalId: string) => {
    setDeletingId(goalId);
    try {
      await deleteGoal(goalId);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = goals.filter((g) => filter === 'all' || g.status === filter);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') return b.priority - a.priority;
    if (sortBy === 'scheduled') {
      if (!a.scheduledStart && !b.scheduledStart) return 0;
      if (!a.scheduledStart) return 1;
      if (!b.scheduledStart) return -1;
      return a.scheduledStart.getTime() - b.scheduledStart.getTime();
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const stats = {
    total: goals.length,
    pending: goals.filter((g) => g.status === 'pending').length,
    inProgress: goals.filter((g) => g.status === 'in_progress').length,
    completed: goals.filter((g) => g.status === 'completed').length,
    rate: goals.length > 0 ? Math.round((goals.filter((g) => g.status === 'completed').length / goals.length) * 100) : 0,
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Task Dashboard</h2>
          <p className="text-gray-500 text-xs mt-0.5">Track and manage your goals</p>
        </div>
        <span className="text-xs text-gray-400">{goals.length} total</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-gray-100">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-700">{stats.inProgress}</p>
          <p className="text-xs text-blue-500">Active</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-yellow-700">{stats.pending}</p>
          <p className="text-xs text-yellow-500">Pending</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-700">{stats.rate}%</p>
          <p className="text-xs text-green-500">Done</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {(['all', 'pending', 'in_progress', 'completed'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'Active' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortType)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="priority">Sort: Priority</option>
          <option value="scheduled">Sort: Scheduled</option>
          <option value="created">Sort: Created</option>
        </select>
      </div>

      {/* Task list */}
      <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No goals yet</p>
            <p className="text-gray-400 text-xs mt-1">Add your first goal to get started</p>
          </div>
        ) : (
          sorted.map((goal) => {
            const priority = PRIORITY_CONFIG[goal.priority] || PRIORITY_CONFIG[3];
            const isCompleted = goal.status === 'completed';
            const statusCfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.pending;

            return (
              <div
                key={goal.id}
                className={`px-5 py-4 hover:bg-gray-50 transition-colors group ${isCompleted ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Status circle */}
                  <button
                    onClick={() => handleStatusToggle(goal)}
                    className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : goal.status === 'in_progress'
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-indigo-400'
                    }`}
                    title={isCompleted ? 'Mark incomplete' : goal.status === 'in_progress' ? 'Mark complete' : 'Start task'}
                  >
                    {isCompleted && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {goal.status === 'in_progress' && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm text-gray-900 ${isCompleted ? 'line-through' : ''}`}>
                        {goal.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.color}`}>
                        {priority.label}
                      </span>
                      <span className="text-base" title={goal.category}>{CATEGORY_ICONS[goal.category] || '📋'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>

                    {goal.description && (
                      <p className="text-gray-500 text-xs mt-1 line-clamp-1">{goal.description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      {goal.estimatedDuration && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {goal.estimatedDuration}m
                        </span>
                      )}
                      {goal.energyRequired && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {goal.energyRequired}/10
                        </span>
                      )}
                      {goal.deadline && (
                        <span className={`flex items-center gap-1 ${new Date(goal.deadline) < new Date() && !isCompleted ? 'text-red-500' : ''}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(goal.id)}
                    disabled={deletingId === goal.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete goal"
                  >
                    {deletingId === goal.id ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

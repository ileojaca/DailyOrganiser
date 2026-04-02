'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals, Goal } from '@/hooks/useGoals';
import { useGamification } from '@/hooks/useGamification';
import { CheckCircle, Circle, Clock, Zap, Target, Award, TrendingUp, Plus, Trash2 } from 'lucide-react';

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
  const { goals, loading, createGoal, updateGoal, deleteGoal, completeGoal } = useGoals(user?.uid);
  const { awardPoints, checkAchievements, updateStreak } = useGamification();
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
      const points = goal.priority * 10;
      await awardPoints(points, `Completed task: ${goal.title}`);
      await updateStreak(true);
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
      <div className="card-style p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-style overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            Task Dashboard
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Track and manage your goals</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{goals.length} total</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-border">
        {[
          { label: 'Total', value: stats.total, icon: Target, color: 'text-foreground', bg: 'bg-muted' },
          { label: 'Active', value: stats.inProgress, icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
          { label: 'Done', value: `${stats.rate}%`, icon: Award, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} card-style p-3 text-center`}>
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-3 flex-wrap">
        <div className="flex gap-2">
          {(['all', 'pending', 'in_progress', 'completed'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'Active' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortType)}
          className="px-4 py-2 rounded-lg border border-border text-sm text-foreground focus:ring-2 focus:ring-accent bg-background"
        >
          <option value="priority">Sort: Priority</option>
          <option value="scheduled">Sort: Scheduled</option>
          <option value="created">Sort: Created</option>
        </select>
      </div>

      {/* Task list */}
      <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="text-center py-16 px-6 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No goals yet</p>
            <p className="text-muted-foreground/70 text-xs">Add your first goal to get started.</p>
          </div>
        ) : (
          sorted.map((goal) => {
            const priority = PRIORITY_CONFIG[goal.priority] || PRIORITY_CONFIG[3];
            const isCompleted = goal.status === 'completed';
            const statusCfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.pending;

            return (
              <div
                key={goal.id}
                className={`px-5 py-4 hover:bg-muted/50 transition-colors group ${isCompleted ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Status circle */}
                  <button
                    onClick={() => handleStatusToggle(goal)}
                    className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : goal.status === 'in_progress'
                        ? 'border-accent bg-accent/10'
                        : 'border-muted-foreground/30 hover:border-accent'
                    }`}
                    title={isCompleted ? 'Mark incomplete' : goal.status === 'in_progress' ? 'Mark complete' : 'Start task'}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : goal.status === 'in_progress' ? (
                      <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm text-foreground ${isCompleted ? 'line-through' : ''}`}>
                        {goal.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.color}`}>
                        {priority.label}
                      </span>
                      <span className="text-base" title={goal.category}>{CATEGORY_ICONS[goal.category] || '📋'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>

                    {goal.description && (
                      <p className="text-muted-foreground text-xs mt-1 line-clamp-1">{goal.description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {goal.estimatedDuration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {goal.estimatedDuration}m
                        </span>
                      )}
                      {goal.energyRequired && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {goal.energyRequired}/10
                        </span>
                      )}
                      {goal.deadline && (
                        <span className={`flex items-center gap-1 ${new Date(goal.deadline) < new Date() && !isCompleted ? 'text-red-500' : ''}`}>
                          <Target className="w-3 h-3" />
                          {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(goal.id)}
                    disabled={deletingId === goal.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-all"
                    title="Delete goal"
                  >
                    {deletingId === goal.id ? (
                      <div className="animate-spin w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
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

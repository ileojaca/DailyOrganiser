'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import CreateGoalModal from '@/components/CreateGoalModal';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals, Goal } from '@/hooks/useGoals';
import { useNotifications } from '@/contexts/NotificationContext';
import { Pencil, Trash2 } from 'lucide-react';

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

type FilterType = 'all' | 'in_progress' | 'completed';
type SortType = 'priority' | 'due' | 'created';

type GoalStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';

const STATUS_CYCLE: Record<string, GoalStatus> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'To Do',
  in_progress: 'In Progress',
  completed: 'Done',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function TasksPage() {
  const { user } = useAuth();
  const { goals, createGoal, updateGoal, deleteGoal, completeGoal, loading: goalsLoading } = useGoals(user?.uid);
  const { addNotification } = useNotifications();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('priority');
  const [quickTask, setQuickTask] = useState('');
  const [quickCategory, setQuickCategory] = useState<'work' | 'personal' | 'health' | 'learning' | 'social' | 'family'>('personal');
  const [quickPriority, setQuickPriority] = useState(3);
  const [quickDuration, setQuickDuration] = useState(30);
  const [addingTask, setAddingTask] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Goal | null>(null);

  const filteredTasks = goals.filter(g => {
    if (filter === 'all') return g.status === 'pending' || g.status === 'in_progress';
    if (filter === 'in_progress') return g.status === 'in_progress';
    if (filter === 'completed') return g.status === 'completed';
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sort === 'priority') return b.priority - a.priority;
    if (sort === 'due') {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sort === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return 0;
  });

  const handleQuickAdd = async () => {
    if (!quickTask.trim()) return;
    setAddingTask(true);
    try {
      await createGoal({
        title: quickTask.trim(),
        category: quickCategory,
        priority: quickPriority,
        estimatedDuration: quickDuration,
        energyRequired: 5
      });
      setQuickTask('');
      addNotification({ type: 'success', title: 'Task added', message: `"${quickTask.trim()}" added to your tasks.` });
    } finally {
      setAddingTask(false);
    }
  };

  const handleStatusCycle = async (task: typeof goals[0]) => {
    const next = STATUS_CYCLE[task.status] || 'pending';
    if (next === 'completed') {
      await completeGoal(task.id);
    } else {
      await updateGoal(task.id, { status: next });
    }
  };

  const handleDeleteTask = async (task: Goal) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await deleteGoal(task.id);
      addNotification({ type: 'success', title: 'Task deleted', message: `"${task.title}" has been removed.` });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete task.' });
    }
  };

  if (!user) return <AppShell><div /></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">All Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage and track all your tasks</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-accent text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              style={filter === 'all' ? { background: 'var(--accent-color)' } : undefined}
            >
              All
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'in_progress'
                  ? 'bg-accent text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              style={filter === 'in_progress' ? { background: 'var(--accent-color)' } : undefined}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'completed'
                  ? 'bg-accent text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              style={filter === 'completed' ? { background: 'var(--accent-color)' } : undefined}
            >
              Done
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-gray-600 dark:text-gray-400">Sort:</label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white"
            >
              <option value="priority">Priority</option>
              <option value="due">Due Date</option>
              <option value="created">Created</option>
            </select>
          </div>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-8 text-center">
            <div className="inline-block mb-4 p-3 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)' }}>
              <div className="text-4xl">📋</div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {filter === 'completed' ? 'No completed tasks yet' : 'No tasks in this view'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {filter === 'completed'
                ? 'Tasks you complete will appear here'
                : 'Create your first task below or go to the home page to get started'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
            {sortedTasks.map((task, idx) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  idx < sortedTasks.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                }`}
              >
                <div className={`w-1 h-10 rounded-full flex-shrink-0 ${priorityBarColor(task.priority)}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400">{CATEGORY_EMOJI[task.category] || '📌'} {task.category}</span>
                    {task.estimatedDuration && <span className="text-xs text-gray-400">· {task.estimatedDuration}m</span>}
                    {task.deadline && (
                      <span className={`text-xs font-medium ${new Date(task.deadline) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                        · {formatDeadline(task.deadline)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityBadge(task.priority)}`}>
                    {PRIORITY_LABEL[task.priority] || 'Medium'}
                  </span>
                  <button
                    onClick={() => handleStatusCycle(task)}
                    title={`Click to change: ${STATUS_LABEL[task.status]} → ${STATUS_LABEL[STATUS_CYCLE[task.status] || 'pending']}`}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors hover:opacity-80 ${STATUS_STYLES[task.status] || STATUS_STYLES.pending}`}
                  >
                    {STATUS_LABEL[task.status] || 'To Do'}
                  </button>
                  <button
                    onClick={() => setEditingTask(task)}
                    title="Edit task"
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task)}
                    title="Delete task"
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick add form */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick add</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleQuickAdd(); }} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={quickTask}
                  onChange={(e) => setQuickTask(e.target.value)}
                  placeholder="What's your next task?"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent shadow-sm"
                  style={{ '--tw-ring-color': 'color-mix(in srgb, var(--accent-color) 30%, transparent)' } as React.CSSProperties}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    id="category"
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value as typeof quickCategory)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="health">Health</option>
                    <option value="learning">Learning</option>
                    <option value="social">Social</option>
                    <option value="family">Family</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    id="priority"
                    value={quickPriority}
                    onChange={(e) => setQuickPriority(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                  >
                    <option value="1">Low</option>
                    <option value="2">Normal</option>
                    <option value="3">Medium</option>
                    <option value="4">High</option>
                    <option value="5">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="quickDuration" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Duration (min)</label>
                <input
                  id="quickDuration"
                  type="number"
                  value={quickDuration}
                  onChange={(e) => setQuickDuration(parseInt(e.target.value) || 30)}
                  min="5"
                  max="480"
                  step="5"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={!quickTask.trim() || addingTask}
                className="w-full h-10 text-white font-semibold rounded-lg disabled:opacity-40 transition-opacity"
                style={{ background: 'var(--accent-color)' }}
              >
                {addingTask ? 'Adding...' : 'Add Task'}
              </button>
            </form>
          </div>

          {/* Detailed add */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add with details</h2>
            <button
              onClick={() => setModalOpen(true)}
              className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-accent hover:text-accent hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-all flex items-center justify-center"
              style={{ '--hover-color': 'var(--accent-color)' } as React.CSSProperties}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">+</div>
                <p className="font-medium">Add goal with description</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Set duration, category, and add notes</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Create modal */}
      <CreateGoalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="create"
        onSuccess={() => {
          addNotification({ type: 'success', title: 'Goal created', message: 'Your goal has been added.' });
        }}
      />

      {/* Edit modal */}
      <CreateGoalModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        mode="edit"
        editingGoal={editingTask ?? undefined}
        onSuccess={() => {
          addNotification({ type: 'success', title: 'Goal updated', message: 'Your goal has been saved.' });
          setEditingTask(null);
        }}
      />
    </AppShell>
  );
}

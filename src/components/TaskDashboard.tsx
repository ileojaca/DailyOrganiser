'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  estimated_duration: number | null;
  energy_required: number | null;
  scheduled_start: string | null;
  created_at: string;
  completed_at: string | null;
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'Minimal', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  2: { label: 'Low', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  3: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  4: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  5: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

const CATEGORY_ICONS: Record<string, string> = {
  work: '💼',
  personal: '🏠',
  health: '❤️',
  learning: '📚',
  social: '👥',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: '⏳' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: '▶️' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: '✅' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: '❌' },
};

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'scheduled' | 'created'>('priority');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Use mock data for demo
        setTasks(getMockTasks());
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks(getMockTasks());
    } finally {
      setLoading(false);
    }
  };

  const getMockTasks = (): Task[] => [
    {
      id: '1',
      title: 'Complete project proposal',
      description: 'Draft the Q2 project proposal with budget estimates',
      category: 'work',
      priority: 5,
      status: 'in_progress',
      estimated_duration: 120,
      energy_required: 8,
      scheduled_start: new Date().toISOString(),
      created_at: new Date().toISOString(),
      completed_at: null,
    },
    {
      id: '2',
      title: 'Morning workout',
      description: '30-minute cardio session',
      category: 'health',
      priority: 4,
      status: 'completed',
      estimated_duration: 30,
      energy_required: 6,
      scheduled_start: null,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      completed_at: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Review team updates',
      description: 'Check Slack and email for team communications',
      category: 'work',
      priority: 3,
      status: 'pending',
      estimated_duration: 20,
      energy_required: 4,
      scheduled_start: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    },
    {
      id: '4',
      title: 'Read industry article',
      description: 'Stay updated with latest trends',
      category: 'learning',
      priority: 2,
      status: 'pending',
      estimated_duration: 15,
      energy_required: 3,
      scheduled_start: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    },
  ];

  const handleStatusToggle = async (taskId: string, newStatus: Task['status']) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Update local state for demo
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
            : t
        ));
        return;
      }

      const updates: Partial<Task> = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else if (newStatus === 'pending' || newStatus === 'in_progress') {
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, ...updates } : t
      ));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'scheduled':
        if (!a.scheduled_start && !b.scheduled_start) return 0;
        if (!a.scheduled_start) return 1;
        if (!b.scheduled_start) return -1;
        return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
      case 'created':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0,
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Dashboard</h2>
          <p className="text-gray-600 mt-1">Manage your daily goals and track progress</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-600">In Progress</p>
          <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
          <p className="text-sm text-yellow-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-600">Completion Rate</p>
          <p className="text-2xl font-bold text-green-700">{stats.completionRate}%</p>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All Tasks' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="priority">Priority</option>
            <option value="scheduled">Scheduled Time</option>
            <option value="created">Created Date</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-lg">No tasks found</p>
            <p className="text-gray-400 text-sm mt-1">Create a new goal to get started</p>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const priority = PRIORITY_CONFIG[task.priority];
            const status = STATUS_CONFIG[task.status];
            const isCompleted = task.status === 'completed';
            
            return (
              <div
                key={task.id}
                className={`bg-white rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                  isCompleted ? 'border-gray-200 opacity-75' : priority.border
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Status Toggle */}
                  <button
                    onClick={() => handleStatusToggle(task.id, isCompleted ? 'pending' : 'completed')}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-indigo-500'
                    }`}
                  >
                    {isCompleted && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-semibold text-gray-900 ${isCompleted ? 'line-through' : ''}`}>
                        {task.title}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.color}`}>
                        {priority.label}
                      </span>
                      <span className="text-lg" title={task.category}>
                        {CATEGORY_ICONS[task.category] || '📋'}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {task.estimated_duration && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {task.estimated_duration} min
                        </span>
                      )}
                      {task.energy_required && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Energy: {task.energy_required}/10
                        </span>
                      )}
                      {task.scheduled_start && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(task.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col gap-2">
                    {task.status !== 'completed' && task.status !== 'cancelled' && (
                      <>
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleStatusToggle(task.id, 'in_progress')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Start task"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={() => handleStatusToggle(task.id, 'pending')}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Pause task"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

'use client';

import AppShell from '@/components/AppShell';
import DeepWorkAnalytics from '@/components/DeepWorkAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { useAccomplishmentLogs } from '@/hooks/useAccomplishmentLogs';

const CATEGORY_ICONS: Record<string, string> = {
  work: '💼', personal: '🏠', health: '💪', learning: '📚', social: '👥',
};

export default function InsightsPage() {
  const { user } = useAuth();
  const { goals, loading: goalsLoading } = useGoals(user?.uid);
  const { logs, loading: logsLoading } = useAccomplishmentLogs(user?.uid);

  const loading = goalsLoading || logsLoading;

  const total = goals.length;
  const completed = goals.filter((g) => g.status === 'completed').length;
  const inProgress = goals.filter((g) => g.status === 'in_progress').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const avgEfficiency =
    logs.length > 0
      ? Math.round((logs.reduce((sum, l) => sum + l.efficiencyScore, 0) / logs.length) * 100)
      : 0;

  // Category breakdown
  const categoryStats = ['work', 'personal', 'health', 'learning', 'social'].map((cat) => {
    const catGoals = goals.filter((g) => g.category === cat);
    const catDone = catGoals.filter((g) => g.status === 'completed').length;
    return { cat, total: catGoals.length, done: catDone };
  }).filter((c) => c.total > 0);

  // Recent completions (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentLogs = logs.filter((l) => new Date(l.scheduledDate) >= sevenDaysAgo);
  const recentCompleted = recentLogs.filter((l) => l.completionStatus === 'completed').length;

  if (loading) {
    return (
      <AppShell>
        <div className="p-6 max-w-5xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
          <p className="text-gray-500 text-sm mt-1">Your productivity at a glance</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Goals', value: total, color: 'text-gray-900', bg: 'bg-gray-50' },
            { label: 'Completed', value: completed, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Completion Rate', value: `${completionRate}%`, color: 'text-indigo-700', bg: 'bg-indigo-50' },
            { label: 'Avg Efficiency', value: `${avgEfficiency}%`, color: 'text-purple-700', bg: 'bg-purple-50' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-5 border border-gray-100`}>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Goals by Category</h2>
            {categoryStats.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No goals yet</p>
            ) : (
              <div className="space-y-3">
                {categoryStats.map(({ cat, total: t, done }) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 flex items-center gap-1.5">
                        <span>{CATEGORY_ICONS[cat]}</span>
                        <span className="capitalize">{cat}</span>
                      </span>
                      <span className="text-xs text-gray-500">{done}/{t}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${t > 0 ? (done / t) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Last 7 Days</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <span className="text-sm text-gray-700">Sessions logged</span>
                <span className="text-lg font-bold text-green-700">{recentLogs.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <span className="text-sm text-gray-700">Completed sessions</span>
                <span className="text-lg font-bold text-blue-700">{recentCompleted}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                <span className="text-sm text-gray-700">Active tasks</span>
                <span className="text-lg font-bold text-purple-700">{inProgress}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deep Work Analytics */}
        <DeepWorkAnalytics />

        {/* Recent logs */}
        {logs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Recent Sessions</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {logs.slice(0, 10).map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-800">{log.scheduledDate}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.actualDuration ? `${log.actualDuration}m` : '—'} · Hour {log.scheduledHour}:00
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.completionStatus === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : log.completionStatus === 'partial'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {log.completionStatus}
                    </span>
                    <span className="text-xs text-gray-500">{Math.round(log.efficiencyScore * 100)}% eff.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

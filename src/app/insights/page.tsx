'use client';

import AppShell from '@/components/AppShell';
import DeepWorkAnalytics from '@/components/DeepWorkAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { useAccomplishmentLogs } from '@/hooks/useAccomplishmentLogs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Clock, Award } from 'lucide-react';

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

  // Productivity trend data (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent30Logs = logs.filter((l) => new Date(l.scheduledDate) >= thirtyDaysAgo);
  const productivityData = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayLogs = recent30Logs.filter(l => l.scheduledDate === dateStr);
    const completed = dayLogs.filter(l => l.completionStatus === 'completed').length;
    const total = dayLogs.length;
    const rate = total > 0 ? (completed / total) * 100 : 0;
    productivityData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completionRate: Math.round(rate),
      sessions: total
    });
  }

  // Category pie chart data
  const categoryPieData = categoryStats.map(({ cat, total: t, done }) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: t,
    completed: done,
    color: {
      work: '#3B82F6',
      personal: '#10B981',
      health: '#F59E0B',
      learning: '#8B5CF6',
      social: '#EF4444'
    }[cat] || '#6B7280'
  }));

  // Priority distribution
  const priorityData = [1, 2, 3, 4, 5].map(priority => ({
    priority: PRIORITY_CONFIG[priority].label,
    count: goals.filter(g => g.priority === priority).length,
    color: {
      1: '#6B7280',
      2: '#3B82F6',
      3: '#F59E0B',
      4: '#EF4444',
      5: '#DC2626'
    }[priority]
  })).filter(d => d.count > 0);

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
      <motion.div 
        className="p-6 max-w-7xl mx-auto space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <motion.h1 
            className="text-3xl font-bold text-foreground"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            Insights & Analytics
          </motion.h1>
          <motion.p 
            className="text-muted-foreground text-sm mt-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Advanced analytics for your productivity journey
          </motion.p>
        </div>

        {/* Premium Stats Grid */}
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {[
            { label: 'Total Goals', value: total, color: 'text-foreground', bg: 'bg-card', icon: Target },
            { label: 'Completed', value: completed, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950', icon: Award },
            { label: 'Completion Rate', value: `${completionRate}%`, color: 'text-accent', bg: 'bg-accent/10', icon: TrendingUp },
            { label: 'Avg Efficiency', value: `${avgEfficiency}%`, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950', icon: Clock },
          ].map((stat, index) => (
            <motion.div 
              key={stat.label} 
              className={`${stat.bg} card-style p-6 border`}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Productivity Trend */}
          <motion.div 
            className="card-style p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Productivity Trend (30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completionRate" 
                  stroke="var(--accent-color)" 
                  strokeWidth={3}
                  dot={{ fill: 'var(--accent-color)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'var(--accent-color)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Category Distribution */}
          <motion.div 
            className="card-style p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-accent" />
              Goals by Category
            </h3>
            {categoryPieData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No goals yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {categoryPieData.length > 0 && (
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {categoryPieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Priority Distribution */}
        <motion.div 
          className="card-style p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-accent" />
            Priority Distribution
          </h3>
          {priorityData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">No goals yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="priority" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Recent Activity & Deep Work */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Recent activity */}
          <motion.div 
            className="card-style p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Last 7 Days</h3>
            <div className="space-y-4">
              {[
                { label: 'Sessions logged', value: recentLogs.length, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
                { label: 'Completed sessions', value: recentCompleted, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
                { label: 'Active tasks', value: inProgress, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
              ].map((item) => (
                <motion.div 
                  key={item.label}
                  className={`flex items-center justify-between p-4 ${item.bg} rounded-xl`}
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="text-sm text-foreground">{item.label}</span>
                  <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Deep Work Analytics Placeholder */}
          <motion.div 
            className="card-style p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <DeepWorkAnalytics />
          </motion.div>
        </div>

        {/* Recent logs */}
        {logs.length > 0 && (
          <motion.div 
            className="card-style overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Recent Sessions</h3>
            </div>
            <div className="divide-y divide-border">
              {logs.slice(0, 10).map((log, index) => (
                <motion.div 
                  key={log.id} 
                  className="px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + index * 0.1 }}
                >
                  <div>
                    <p className="text-sm text-foreground">{log.scheduledDate}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.actualDuration ? `${log.actualDuration}m` : '—'} · Hour {log.scheduledHour}:00
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      log.completionStatus === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : log.completionStatus === 'partial'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {log.completionStatus}
                    </span>
                    <span className="text-xs text-muted-foreground">{Math.round(log.efficiencyScore * 100)}% eff.</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AppShell>
  );
}

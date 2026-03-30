'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams, Team, TeamMember } from '@/hooks/useTeams';
import { useGoals, Goal } from '@/hooks/useGoals';

interface TeamAnalyticsProps {
  team: Team;
}

interface MemberStats {
  memberId: string;
  memberName: string;
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
  completionRate: number;
  averagePriority: number;
}

export default function TeamAnalytics({ team }: TeamAnalyticsProps) {
  const { user } = useAuth();
  const { getTeamMembers } = useTeams(user?.uid);
  const { goals } = useGoals(user?.uid);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    loadMembers();
  }, [team.id]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const teamMembers = await getTeamMembers(team.id);
      setMembers(teamMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredGoals = () => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        return goals;
    }

    return goals.filter(goal => goal.createdAt >= startDate);
  };

  const calculateMemberStats = (): MemberStats[] => {
    const filteredGoals = getFilteredGoals();

    return members.map(member => {
      const memberGoals = filteredGoals.filter(goal => goal.assigneeId === member.userId);
      const completedGoals = memberGoals.filter(goal => goal.status === 'completed').length;
      const inProgressGoals = memberGoals.filter(goal => goal.status === 'in_progress').length;
      const totalGoals = memberGoals.length;
      const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
      const averagePriority = totalGoals > 0
        ? memberGoals.reduce((sum, goal) => sum + goal.priority, 0) / totalGoals
        : 0;

      return {
        memberId: member.userId,
        memberName: member.user?.fullName || member.user?.email || 'Unknown',
        totalGoals,
        completedGoals,
        inProgressGoals,
        completionRate,
        averagePriority,
      };
    });
  };

  const memberStats = calculateMemberStats();
  const filteredGoals = getFilteredGoals();
  const totalGoals = filteredGoals.length;
  const completedGoals = filteredGoals.filter(goal => goal.status === 'completed').length;
  const overallCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  const categoryStats = filteredGoals.reduce((acc, goal) => {
    const category = goal.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = { total: 0, completed: 0 };
    }
    acc[category].total++;
    if (goal.status === 'completed') {
      acc[category].completed++;
    }
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Team Analytics</h2>
        <div className="flex gap-2">
          {(['week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading analytics...</div>
      ) : (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Goals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalGoals}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedGoals}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {overallCompletionRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Member Performance */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Member Performance</h3>
            <div className="space-y-3">
              {memberStats.map((stat) => (
                <div
                  key={stat.memberId}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                      <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                        {stat.memberName[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{stat.memberName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {stat.completedGoals} / {stat.totalGoals} goals completed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {stat.completionRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {stat.inProgressGoals} in progress
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Category Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(categoryStats).map(([category, stats]) => (
                <div
                  key={category}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{category}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {stats.completed} / {stats.total} completed
                  </p>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams, Team, TeamMember } from '@/hooks/useTeams';
import { useGoals, Goal } from '@/hooks/useGoals';

interface TaskAssignmentProps {
  goal: Goal;
  team: Team;
  onAssignmentChange?: (goalId: string, assigneeId: string | null) => void;
}

export default function TaskAssignment({ goal, team, onAssignmentChange }: TaskAssignmentProps) {
  const { user } = useAuth();
  const { getTeamMembers } = useTeams(user?.uid);
  const { updateGoal } = useGoals(user?.uid);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(goal.assigneeId || null);

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

  const handleAssign = async (assigneeId: string | null) => {
    if (!user?.uid) return;

    setAssigning(true);
    try {
      await updateGoal(goal.id, { assigneeId: assigneeId || undefined });
      setSelectedAssignee(assigneeId);
      onAssignmentChange?.(goal.id, assigneeId);
    } catch (error) {
      console.error('Error assigning task:', error);
    } finally {
      setAssigning(false);
    }
  };

  const assignee = members.find(m => m.userId === selectedAssignee);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        ) : assignee ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <span className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                {assignee.user?.fullName?.[0] || assignee.user?.email?.[0] || '?'}
              </span>
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {assignee.user?.fullName || assignee.user?.email}
            </span>
            <button
              onClick={() => handleAssign(null)}
              disabled={assigning}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
            >
              Unassign
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selectedAssignee || ''}
              onChange={(e) => handleAssign(e.target.value || null)}
              disabled={assigning}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="">Assign to...</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user?.fullName || member.user?.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

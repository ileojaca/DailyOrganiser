'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams, Team, TeamMember } from '@/hooks/useTeams';
import { useGoals, Goal } from '@/hooks/useGoals';
import TeamInvite from './TeamInvite';

interface TeamWorkspaceProps {
  team: Team;
}

export default function TeamWorkspace({ team }: TeamWorkspaceProps) {
  const { user } = useAuth();
  const { getTeamMembers, leaveTeam, deleteTeam } = useTeams(user?.uid);
  const { goals, createGoal, updateGoal } = useGoals(user?.uid);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'goals' | 'members' | 'settings'>('goals');
  const [showInvite, setShowInvite] = useState(false);

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

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;
    try {
      await leaveTeam(team.id);
    } catch (error) {
      console.error('Error leaving team:', error);
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;
    try {
      await deleteTeam(team.id);
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const isOwner = user?.uid === team.ownerId;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{team.name}</h2>
            {team.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{team.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvite(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Invite
            </button>
            {isOwner ? (
              <button
                onClick={handleDeleteTeam}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete Team
              </button>
            ) : (
              <button
                onClick={handleLeaveTeam}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Leave Team
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          {['goals', 'members', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'goals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Team Goals</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {goals.filter(g => g.status !== 'completed').length} active goals
              </span>
            </div>
            {goals.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No goals yet. Create your first team goal!
              </div>
            ) : (
              <div className="space-y-3">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{goal.title}</h4>
                        {goal.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{goal.description}</p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          goal.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : goal.status === 'in_progress'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {goal.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Team Members</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {members.length} / {team.maxMembers} members
              </span>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading members...</div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                        <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                          {member.user?.fullName?.[0] || member.user?.email?.[0] || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.user?.fullName || member.user?.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{member.role}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Team Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Team Name
                  </label>
                  <p className="text-gray-900 dark:text-white">{team.name}</p>
                </div>
                {team.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <p className="text-gray-600 dark:text-gray-400">{team.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invite Code
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-gray-900 dark:text-white">
                      {team.inviteCode}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(team.inviteCode)}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invite Team Members</h3>
              <button
                onClick={() => setShowInvite(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TeamInvite team={team} onTeamJoined={() => setShowInvite(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

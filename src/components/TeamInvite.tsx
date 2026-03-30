'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams, Team } from '@/hooks/useTeams';

interface TeamInviteProps {
  team?: Team;
  onTeamJoined?: (team: Team) => void;
  onTeamCreated?: (team: Team) => void;
}

export default function TeamInvite({ team, onTeamJoined, onTeamCreated }: TeamInviteProps) {
  const { user } = useAuth();
  const { createTeam, joinTeam } = useTeams(user?.uid);
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [inviteCode, setInviteCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const joinedTeam = await joinTeam(inviteCode.trim().toUpperCase());
      setSuccess(`Successfully joined "${joinedTeam.name}"!`);
      setInviteCode('');
      onTeamJoined?.(joinedTeam);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const newTeam = await createTeam({
        name: teamName.trim(),
        description: teamDescription.trim() || undefined,
      });
      setSuccess(`Team "${newTeam.name}" created! Invite code: ${newTeam.inviteCode}`);
      setTeamName('');
      setTeamDescription('');
      onTeamCreated?.(newTeam);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess('Invite code copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {team ? 'Team Settings' : 'Join or Create Team'}
        </h2>
        {!team && (
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setMode('join')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'join'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Join Team
            </button>
            <button
              onClick={() => setMode('create')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'create'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Create Team
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {team ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team Name
            </label>
            <p className="text-gray-900 dark:text-white font-medium">{team.name}</p>
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
              <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-mono text-lg text-gray-900 dark:text-white">
                {team.inviteCode}
              </code>
              <button
                onClick={() => copyInviteCode(team.inviteCode)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Share this code with others to invite them to your team
            </p>
          </div>
        </div>
      ) : mode === 'join' ? (
        <form onSubmit={handleJoinTeam} className="space-y-4">
          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invite Code
            </label>
            <input
              type="text"
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter team invite code"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              maxLength={10}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !inviteCode.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Joining...' : 'Join Team'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team Name *
            </label>
            <input
              type="text"
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              maxLength={50}
            />
          </div>

          <div>
            <label htmlFor="teamDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              id="teamDescription"
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              placeholder="Describe your team"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              maxLength={200}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !teamName.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Team'}
          </button>
        </form>
      )}
    </div>
  );
}

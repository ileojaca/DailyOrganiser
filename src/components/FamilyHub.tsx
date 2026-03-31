'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { FamilyMember, FamilyEvent, ConnectionPrompt } from '@/types/lifeManagement';

export default function FamilyHub() {
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [connectionPrompts, setConnectionPrompts] = useState<ConnectionPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', relationship: 'spouse' as const });
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'meal' as const,
    startTime: '',
    endTime: '',
    participants: [] as string[],
  });

  useEffect(() => {
    if (!user) return;

    // Load from localStorage
    const savedMembers = localStorage.getItem(`family_members_${user.uid}`);
    const savedEvents = localStorage.getItem(`family_events_${user.uid}`);
    
    if (savedMembers) setFamilyMembers(JSON.parse(savedMembers));
    if (savedEvents) setEvents(JSON.parse(savedEvents));

    // Generate connection prompts
    generateConnectionPrompts();
    setLoading(false);
  }, [user]);

  const generateConnectionPrompts = () => {
    const prompts: ConnectionPrompt[] = [];
    const now = new Date();

    familyMembers.forEach(member => {
      const lastInteraction = member.createdAt; // In real app, track actual interactions
      const daysSinceInteraction = Math.floor(
        (now.getTime() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceInteraction >= 3) {
        prompts.push({
          id: `prompt_${member.id}`,
          memberId: member.id,
          lastInteraction: new Date(lastInteraction),
          suggestedAction: `Schedule quality time with ${member.name}`,
          priority: daysSinceInteraction >= 7 ? 'high' : 'medium',
          dismissed: false,
          createdAt: now,
        });
      }
    });

    setConnectionPrompts(prompts);
  };

  const addFamilyMember = () => {
    if (!user || !newMember.name) return;

    const member: FamilyMember = {
      id: `member_${Date.now()}`,
      userId: user.uid,
      name: newMember.name,
      relationship: newMember.relationship,
      calendarSyncEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updated = [...familyMembers, member];
    setFamilyMembers(updated);
    localStorage.setItem(`family_members_${user.uid}`, JSON.stringify(updated));
    setNewMember({ name: '', relationship: 'spouse' });
    setShowAddMember(false);
    generateConnectionPrompts();
  };

  const addFamilyEvent = () => {
    if (!user || !newEvent.title || !newEvent.startTime) return;

    const event: FamilyEvent = {
      id: `event_${Date.now()}`,
      title: newEvent.title,
      type: newEvent.type,
      startTime: new Date(newEvent.startTime),
      endTime: new Date(newEvent.endTime || newEvent.startTime),
      participants: newEvent.participants,
      recurring: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updated = [...events, event];
    setEvents(updated);
    localStorage.setItem(`family_events_${user.uid}`, JSON.stringify(updated));
    setNewEvent({ title: '', type: 'meal', startTime: '', endTime: '', participants: [] });
    setShowAddEvent(false);
  };

  const dismissPrompt = (promptId: string) => {
    setConnectionPrompts(prev => prev.filter(p => p.id !== promptId));
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case 'spouse': return '💑';
      case 'child': return '👶';
      case 'parent': return '👨‍👩‍👧';
      case 'sibling': return '👫';
      default: return '👤';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'meal': return '🍽️';
      case 'outing': return '🚗';
      case 'game': return '🎮';
      case 'homework': return '📚';
      case 'celebration': return '🎉';
      default: return '📅';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Family Hub</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddMember(true)}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Add Member
          </button>
          <button
            onClick={() => setShowAddEvent(true)}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Add Event
          </button>
        </div>
      </div>

      {/* Connection Prompts */}
      {connectionPrompts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Connection Prompts
          </h3>
          <div className="space-y-2">
            {connectionPrompts.map((prompt) => {
              const member = familyMembers.find(m => m.id === prompt.memberId);
              return (
                <div
                  key={prompt.id}
                  className={`p-3 rounded-lg border ${
                    prompt.priority === 'high'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getRelationshipIcon(member?.relationship || 'other')}</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {prompt.suggestedAction}
                      </p>
                    </div>
                    <button
                      onClick={() => dismissPrompt(prompt.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Family Members */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Family Members</h3>
        {familyMembers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No family members added yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span className="text-xl">{getRelationshipIcon(member.relationship)}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {member.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {member.relationship}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Family Events */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Upcoming Events</h3>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No family events scheduled.
          </p>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span className="text-xl">{getEventTypeIcon(event.type)}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {event.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(event.startTime).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Family Member
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Relationship
                </label>
                <select
                  value={newMember.relationship}
                  onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddMember(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={addFamilyMember}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Family Event
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Family dinner"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="meal">Meal</option>
                  <option value="outing">Outing</option>
                  <option value="game">Game</option>
                  <option value="homework">Homework</option>
                  <option value="celebration">Celebration</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddEvent(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={addFamilyEvent}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

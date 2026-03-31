'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  avatar?: string;
}

interface FamilyActivity {
  id: string;
  title: string;
  type: 'meal' | 'outing' | 'game' | 'homework' | 'other';
  scheduledTime: Date;
  duration: number;
  participants: string[];
  notes?: string;
}

export default function FamilyTime() {
  const { user } = useAuth();
  const { goals } = useGoals(user?.uid);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [activities, setActivities] = useState<FamilyActivity[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', relationship: '' });
  const [newActivity, setNewActivity] = useState({
    title: '',
    type: 'meal' as const,
    scheduledTime: '',
    duration: 60,
    participants: [] as string[],
    notes: '',
  });

  // Load family members from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('familyMembers');
    if (saved) {
      setFamilyMembers(JSON.parse(saved));
    }
  }, []);

  // Save family members to localStorage
  useEffect(() => {
    localStorage.setItem('familyMembers', JSON.stringify(familyMembers));
  }, [familyMembers]);

  // Filter family-related goals
  const familyGoals = goals.filter(g => g.category === 'family');

  const addFamilyMember = () => {
    if (!newMember.name || !newMember.relationship) return;
    
    const member: FamilyMember = {
      id: Date.now().toString(),
      name: newMember.name,
      relationship: newMember.relationship,
    };
    
    setFamilyMembers([...familyMembers, member]);
    setNewMember({ name: '', relationship: '' });
    setShowAddMember(false);
  };

  const removeFamilyMember = (id: string) => {
    setFamilyMembers(familyMembers.filter(m => m.id !== id));
  };

  const addActivity = () => {
    if (!newActivity.title || !newActivity.scheduledTime) return;
    
    const activity: FamilyActivity = {
      id: Date.now().toString(),
      title: newActivity.title,
      type: newActivity.type,
      scheduledTime: new Date(newActivity.scheduledTime),
      duration: newActivity.duration,
      participants: newActivity.participants,
      notes: newActivity.notes,
    };
    
    setActivities([...activities, activity]);
    setNewActivity({
      title: '',
      type: 'meal',
      scheduledTime: '',
      duration: 60,
      participants: [],
      notes: '',
    });
    setShowAddActivity(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'meal': return '🍽️';
      case 'outing': return '🚗';
      case 'game': return '🎮';
      case 'homework': return '📚';
      default: return '👨‍👩‍👧‍👦';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Family Time</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddMember(true)}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Add Member
          </button>
          <button
            onClick={() => setShowAddActivity(true)}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Add Activity
          </button>
        </div>
      </div>

      {/* Family Members */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Family Members</h3>
        {familyMembers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No family members added yet. Add your family members to track family time.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {member.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({member.relationship})
                </span>
                <button
                  onClick={() => removeFamilyMember(member.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Family Activities */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Upcoming Activities</h3>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No family activities scheduled. Add activities to plan quality family time.
          </p>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span className="text-xl">{getActivityIcon(activity.type)}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(activity.scheduledTime).toLocaleString()} • {activity.duration} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Family Goals */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Family Goals</h3>
        {familyGoals.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No family goals set. Create goals with "family" category to track them here.
          </p>
        ) : (
          <div className="space-y-2">
            {familyGoals.slice(0, 5).map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className={`w-2 h-2 rounded-full ${
                  goal.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {goal.title}
                </p>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {goal.status}
                </span>
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
                  onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select relationship</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
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

      {/* Add Activity Modal */}
      {showAddActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Family Activity
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Activity Title
                </label>
                <input
                  type="text"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Family dinner"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="meal">Meal</option>
                  <option value="outing">Outing</option>
                  <option value="game">Game</option>
                  <option value="homework">Homework</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Scheduled Time
                </label>
                <input
                  type="datetime-local"
                  value={newActivity.scheduledTime}
                  onChange={(e) => setNewActivity({ ...newActivity, scheduledTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={newActivity.duration}
                  onChange={(e) => setNewActivity({ ...newActivity, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="15"
                  step="15"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddActivity(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={addActivity}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

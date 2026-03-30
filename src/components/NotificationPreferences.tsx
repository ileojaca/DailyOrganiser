'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  taskReminders: boolean;
  deadlineWarnings: boolean;
  productivityInsights: boolean;
  teamUpdates: boolean;
  subscriptionAlerts: boolean;
  reminderTime: number; // hours before deadline
}

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    deadlineWarnings: true,
    productivityInsights: true,
    teamUpdates: true,
    subscriptionAlerts: true,
    reminderTime: 24,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(data.preferences);
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Preferences saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save preferences' });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | number) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Notification Preferences</h2>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Receive notifications via email</p>
          </div>
          <button
            onClick={() => updatePreference('emailNotifications', !preferences.emailNotifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.emailNotifications ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Push Notifications</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Receive browser push notifications</p>
          </div>
          <button
            onClick={() => updatePreference('pushNotifications', !preferences.pushNotifications)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.pushNotifications ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.pushNotifications ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Task Reminders */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Task Reminders</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Get reminded about upcoming tasks</p>
          </div>
          <button
            onClick={() => updatePreference('taskReminders', !preferences.taskReminders)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.taskReminders ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.taskReminders ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Deadline Warnings */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Deadline Warnings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Receive warnings about approaching deadlines</p>
          </div>
          <button
            onClick={() => updatePreference('deadlineWarnings', !preferences.deadlineWarnings)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.deadlineWarnings ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.deadlineWarnings ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Productivity Insights */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Productivity Insights</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Receive AI-powered productivity insights</p>
          </div>
          <button
            onClick={() => updatePreference('productivityInsights', !preferences.productivityInsights)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.productivityInsights ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.productivityInsights ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Team Updates */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Team Updates</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Receive notifications about team activities</p>
          </div>
          <button
            onClick={() => updatePreference('teamUpdates', !preferences.teamUpdates)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.teamUpdates ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.teamUpdates ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Subscription Alerts */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Subscription Alerts</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Receive alerts about subscription status</p>
          </div>
          <button
            onClick={() => updatePreference('subscriptionAlerts', !preferences.subscriptionAlerts)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.subscriptionAlerts ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.subscriptionAlerts ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Reminder Time */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Reminder Time</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">How many hours before a deadline should we remind you?</p>
          <select
            value={preferences.reminderTime}
            onChange={(e) => updatePreference('reminderTime', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={12}>12 hours</option>
            <option value={24}>24 hours</option>
            <option value={48}>48 hours</option>
          </select>
        </div>
      </div>

      <button
        onClick={savePreferences}
        disabled={saving}
        className="mt-6 w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}

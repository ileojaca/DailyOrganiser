'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SlackConfig {
  webhookUrl: string;
  channel: string;
  notifications: {
    taskCompleted: boolean;
    deadlineApproaching: boolean;
    dailySummary: boolean;
    teamUpdates: boolean;
  };
}

export default function SlackIntegration() {
  const { user } = useAuth();
  const [config, setConfig] = useState<SlackConfig>({
    webhookUrl: '',
    channel: '#general',
    notifications: {
      taskCompleted: true,
      deadlineApproaching: true,
      dailySummary: false,
      teamUpdates: true,
    },
  });
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/integrations/slack/config');
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
          setConnected(true);
        }
      }
    } catch (error) {
      console.error('Error loading Slack config:', error);
    }
  };

  const saveConfig = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/integrations/slack/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        setConnected(true);
        setMessage({ type: 'success', text: 'Slack configuration saved!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save Slack configuration' });
      }
    } catch (error) {
      console.error('Error saving Slack config:', error);
      setMessage({ type: 'error', text: 'Failed to save Slack configuration' });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!user || !config.webhookUrl) return;

    try {
      setTesting(true);
      setMessage(null);

      const response = await fetch('/api/integrations/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: config.webhookUrl }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Test message sent to Slack!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to send test message' });
      }
    } catch (error) {
      console.error('Error testing Slack connection:', error);
      setMessage({ type: 'error', text: 'Failed to send test message' });
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    if (!user) return;

    try {
      setMessage(null);
      const response = await fetch('/api/integrations/slack/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setConnected(false);
        setConfig({
          webhookUrl: '',
          channel: '#general',
          notifications: {
            taskCompleted: true,
            deadlineApproaching: true,
            dailySummary: false,
            teamUpdates: true,
          },
        });
        setMessage({ type: 'success', text: 'Slack disconnected' });
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect Slack' });
      }
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
      setMessage({ type: 'error', text: 'Failed to disconnect Slack' });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Slack Integration</h2>

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
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {connected ? 'Connected' : 'Not Connected'}
            </p>
          </div>
          {connected && (
            <button
              onClick={disconnect}
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Webhook URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Slack Webhook URL
          </label>
          <input
            type="url"
            value={config.webhookUrl}
            onChange={(e) => setConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
            placeholder="https://hooks.slack.com/services/..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Create a webhook in your Slack workspace settings
          </p>
        </div>

        {/* Channel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default Channel
          </label>
          <input
            type="text"
            value={config.channel}
            onChange={(e) => setConfig(prev => ({ ...prev, channel: e.target.value }))}
            placeholder="#general"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Notification Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Notifications
          </label>
          <div className="space-y-3">
            {[
              { key: 'taskCompleted', label: 'Task completed' },
              { key: 'deadlineApproaching', label: 'Deadline approaching' },
              { key: 'dailySummary', label: 'Daily summary' },
              { key: 'teamUpdates', label: 'Team updates' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={config.notifications[key as keyof typeof config.notifications]}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    notifications: {
                      ...prev.notifications,
                      [key]: e.target.checked,
                    },
                  }))}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={saveConfig}
            disabled={saving || !config.webhookUrl}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          <button
            onClick={testConnection}
            disabled={testing || !config.webhookUrl}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? 'Testing...' : 'Test'}
          </button>
        </div>

        {/* Info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">How to set up</h4>
          <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>Go to your Slack workspace settings</li>
            <li>Create a new incoming webhook</li>
            <li>Copy the webhook URL and paste it above</li>
            <li>Choose which notifications you want to receive</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

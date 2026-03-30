'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NotionConfig {
  apiKey: string;
  databaseId: string;
  syncEnabled: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily';
  fieldMapping: {
    title: string;
    status: string;
    priority: string;
    dueDate: string;
    category: string;
  };
}

export default function NotionIntegration() {
  const { user } = useAuth();
  const [config, setConfig] = useState<NotionConfig>({
    apiKey: '',
    databaseId: '',
    syncEnabled: false,
    syncFrequency: 'realtime',
    fieldMapping: {
      title: 'Name',
      status: 'Status',
      priority: 'Priority',
      dueDate: 'Due Date',
      category: 'Category',
    },
  });
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [databases, setDatabases] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/integrations/notion/config');
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
          setConnected(true);
        }
      }
    } catch (error) {
      console.error('Error loading Notion config:', error);
    }
  };

  const fetchDatabases = async () => {
    if (!config.apiKey) return;

    try {
      const response = await fetch('/api/integrations/notion/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey }),
      });

      if (response.ok) {
        const data = await response.json();
        setDatabases(data.databases || []);
      }
    } catch (error) {
      console.error('Error fetching Notion databases:', error);
    }
  };

  const saveConfig = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/integrations/notion/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        setConnected(true);
        setMessage({ type: 'success', text: 'Notion configuration saved!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save Notion configuration' });
      }
    } catch (error) {
      console.error('Error saving Notion config:', error);
      setMessage({ type: 'error', text: 'Failed to save Notion configuration' });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!user || !config.apiKey || !config.databaseId) return;

    try {
      setTesting(true);
      setMessage(null);

      const response = await fetch('/api/integrations/notion/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: config.apiKey, databaseId: config.databaseId }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Successfully connected to Notion database!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to connect to Notion database' });
      }
    } catch (error) {
      console.error('Error testing Notion connection:', error);
      setMessage({ type: 'error', text: 'Failed to connect to Notion database' });
    } finally {
      setTesting(false);
    }
  };

  const syncNow = async () => {
    if (!user) return;

    try {
      setSyncing(true);
      setMessage(null);

      const response = await fetch('/api/integrations/notion/sync', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ 
          type: 'success', 
          text: `Synced ${data.syncedTasks} tasks with Notion` 
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to sync with Notion' });
      }
    } catch (error) {
      console.error('Error syncing with Notion:', error);
      setMessage({ type: 'error', text: 'Failed to sync with Notion' });
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = async () => {
    if (!user) return;

    try {
      setMessage(null);
      const response = await fetch('/api/integrations/notion/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setConnected(false);
        setConfig({
          apiKey: '',
          databaseId: '',
          syncEnabled: false,
          syncFrequency: 'realtime',
          fieldMapping: {
            title: 'Name',
            status: 'Status',
            priority: 'Priority',
            dueDate: 'Due Date',
            category: 'Category',
          },
        });
        setDatabases([]);
        setMessage({ type: 'success', text: 'Notion disconnected' });
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect Notion' });
      }
    } catch (error) {
      console.error('Error disconnecting Notion:', error);
      setMessage({ type: 'error', text: 'Failed to disconnect Notion' });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Notion Integration</h2>

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

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notion API Key
          </label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
            onBlur={fetchDatabases}
            placeholder="secret_..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Create an integration at notion.so/my-integrations
          </p>
        </div>

        {/* Database Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notion Database
          </label>
          {databases.length > 0 ? (
            <select
              value={config.databaseId}
              onChange={(e) => setConfig(prev => ({ ...prev, databaseId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select a database...</option>
              {databases.map((db) => (
                <option key={db.id} value={db.id}>{db.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={config.databaseId}
              onChange={(e) => setConfig(prev => ({ ...prev, databaseId: e.target.value }))}
              placeholder="Database ID"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          )}
        </div>

        {/* Sync Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Sync Settings
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.syncEnabled}
                onChange={(e) => setConfig(prev => ({ ...prev, syncEnabled: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Enable automatic sync</span>
            </label>

            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sync Frequency</label>
              <select
                value={config.syncFrequency}
                onChange={(e) => setConfig(prev => ({ ...prev, syncFrequency: e.target.value as NotionConfig['syncFrequency'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
          </div>
        </div>

        {/* Field Mapping */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Field Mapping
          </label>
          <div className="space-y-2">
            {Object.entries(config.fieldMapping).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-20">{key}:</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    fieldMapping: { ...prev.fieldMapping, [key]: e.target.value }
                  }))}
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={saveConfig}
            disabled={saving || !config.apiKey || !config.databaseId}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          <button
            onClick={testConnection}
            disabled={testing || !config.apiKey || !config.databaseId}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? 'Testing...' : 'Test'}
          </button>
          {connected && (
            <button
              onClick={syncNow}
              disabled={syncing}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">How to set up</h4>
          <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>Create a Notion integration at notion.so/my-integrations</li>
            <li>Copy the API key and paste it above</li>
            <li>Share your database with the integration</li>
            <li>Copy the database ID from the URL</li>
            <li>Map your Notion fields to DailyOrganiser fields</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

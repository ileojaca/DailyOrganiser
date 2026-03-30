'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
  lastUsed?: Date;
  permissions: string[];
}

export default function ApiKeyManager() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read']);
  const [creating, setCreating] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, [user]);

  const loadApiKeys = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys || []);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!user || !newKeyName.trim()) return;

    try {
      setCreating(true);
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          permissions: newKeyPermissions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(prev => [data.key, ...prev]);
        setShowCreateModal(false);
        setNewKeyName('');
        setNewKeyPermissions(['read']);
      }
    } catch (error) {
      console.error('Error creating API key:', error);
    } finally {
      setCreating(false);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!user || !confirm('Are you sure you want to revoke this API key?')) return;

    try {
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setApiKeys(prev => prev.filter(key => key.id !== keyId));
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">API Keys</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your API keys for external integrations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Create API Key
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading API keys...</div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No API keys yet. Create your first API key to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <div
              key={apiKey.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">{apiKey.name}</h3>
                  <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                    {apiKey.permissions.join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>Created: {formatDate(apiKey.createdAt)}</span>
                  {apiKey.lastUsed && <span>Last used: {formatDate(apiKey.lastUsed)}</span>}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <code className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                    {apiKey.key.substring(0, 20)}...{apiKey.key.substring(apiKey.key.length - 4)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm"
                  >
                    {copiedKeyId === apiKey.id ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => revokeApiKey(apiKey.id)}
                className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create API Key</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Mobile App, Integration"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  {['read', 'write', 'delete'].map((permission) => (
                    <label key={permission} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newKeyPermissions.includes(permission)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewKeyPermissions(prev => [...prev, permission]);
                          } else {
                            setNewKeyPermissions(prev => prev.filter(p => p !== permission));
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createApiKey}
                disabled={creating || !newKeyName.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

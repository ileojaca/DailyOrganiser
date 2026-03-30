'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

interface WebhookEvent {
  id: string;
  name: string;
  description: string;
}

const AVAILABLE_EVENTS: WebhookEvent[] = [
  { id: 'task.created', name: 'Task Created', description: 'When a new task is created' },
  { id: 'task.completed', name: 'Task Completed', description: 'When a task is marked as completed' },
  { id: 'task.updated', name: 'Task Updated', description: 'When a task is modified' },
  { id: 'task.deleted', name: 'Task Deleted', description: 'When a task is deleted' },
  { id: 'goal.created', name: 'Goal Created', description: 'When a new goal is created' },
  { id: 'goal.completed', name: 'Goal Completed', description: 'When a goal is achieved' },
  { id: 'goal.updated', name: 'Goal Updated', description: 'When a goal is modified' },
  { id: 'team.member_joined', name: 'Team Member Joined', description: 'When a new member joins a team' },
  { id: 'team.task_assigned', name: 'Task Assigned', description: 'When a task is assigned to a team member' },
  { id: 'subscription.updated', name: 'Subscription Updated', description: 'When subscription status changes' },
];

export default function ZapierWebhook() {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, [user]);

  const loadWebhooks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/webhooks');
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (error) {
      console.error('Error loading webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async () => {
    if (!user || !newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) return;

    try {
      setCreating(true);
      setMessage(null);

      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook),
      });

      if (response.ok) {
        const data = await response.json();
        setWebhooks(prev => [data.webhook, ...prev]);
        setShowCreateModal(false);
        setNewWebhook({ name: '', url: '', events: [] });
        setMessage({ type: 'success', text: 'Webhook created successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to create webhook' });
      }
    } catch (error) {
      console.error('Error creating webhook:', error);
      setMessage({ type: 'error', text: 'Failed to create webhook' });
    } finally {
      setCreating(false);
    }
  };

  const toggleWebhook = async (id: string, active: boolean) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });

      if (response.ok) {
        setWebhooks(prev =>
          prev.map(webhook =>
            webhook.id === id ? { ...webhook, active } : webhook
          )
        );
      }
    } catch (error) {
      console.error('Error toggling webhook:', error);
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setWebhooks(prev => prev.filter(webhook => webhook.id !== id));
        setMessage({ type: 'success', text: 'Webhook deleted' });
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  };

  const testWebhook = async (id: string) => {
    if (!user) return;

    try {
      setTesting(id);
      setMessage(null);

      const response = await fetch(`/api/webhooks/${id}/test`, {
        method: 'POST',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Test event sent successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to send test event' });
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      setMessage({ type: 'error', text: 'Failed to send test event' });
    } finally {
      setTesting(null);
    }
  };

  const toggleEvent = (eventId: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Zapier Webhooks</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Connect DailyOrganiser to 5,000+ apps via Zapier
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Add Webhook
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading webhooks...</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No webhooks configured. Add one to start automating your workflow.
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">{webhook.name}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    webhook.active 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }`}>
                    {webhook.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{webhook.url}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {webhook.events.map((event) => (
                    <span key={event} className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded">
                      {event}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => testWebhook(webhook.id)}
                  disabled={testing === webhook.id}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
                >
                  {testing === webhook.id ? 'Testing...' : 'Test'}
                </button>
                <button
                  onClick={() => toggleWebhook(webhook.id, !webhook.active)}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  {webhook.active ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => deleteWebhook(webhook.id)}
                  className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Webhook</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Webhook Name *
                </label>
                <input
                  type="text"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Zapier Integration"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Webhook URL *
                </label>
                <input
                  type="url"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://hooks.zapier.com/..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Get this from your Zapier webhook trigger
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Events to Send *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <label
                      key={event.id}
                      className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        newWebhook.events.includes(event.id)
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-gray-50 dark:bg-gray-700 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event.id)}
                        onChange={() => toggleEvent(event.id)}
                        className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{event.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{event.description}</p>
                      </div>
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
                onClick={createWebhook}
                disabled={creating || !newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

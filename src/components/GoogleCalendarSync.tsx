'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
}

export default function GoogleCalendarSync() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, [user]);

  const checkConnection = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/integrations/google-calendar/status');
      if (response.ok) {
        const data = await response.json();
        setConnected(data.connected);
        setLastSync(data.lastSync);
      }
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
    }
  };

  const connectGoogleCalendar = async () => {
    if (!user) return;

    try {
      setMessage(null);
      const response = await fetch('/api/integrations/google-calendar/connect', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to connect Google Calendar' });
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      setMessage({ type: 'error', text: 'Failed to connect Google Calendar' });
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!user) return;

    try {
      setMessage(null);
      const response = await fetch('/api/integrations/google-calendar/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setConnected(false);
        setLastSync(null);
        setMessage({ type: 'success', text: 'Google Calendar disconnected' });
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect Google Calendar' });
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      setMessage({ type: 'error', text: 'Failed to disconnect Google Calendar' });
    }
  };

  const syncWithGoogleCalendar = async () => {
    if (!user) return;

    try {
      setSyncing(true);
      setMessage(null);

      const response = await fetch('/api/integrations/google-calendar/sync', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setLastSync(new Date().toISOString());
        setMessage({ 
          type: 'success', 
          text: `Synced ${data.syncedTasks} tasks with Google Calendar` 
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to sync with Google Calendar' });
      }
    } catch (error) {
      console.error('Error syncing with Google Calendar:', error);
      setMessage({ type: 'error', text: 'Failed to sync with Google Calendar' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Google Calendar Sync</h2>

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
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {connected ? 'Connected' : 'Not Connected'}
              </p>
              {lastSync && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last synced: {new Date(lastSync).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          {connected ? (
            <button
              onClick={disconnectGoogleCalendar}
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectGoogleCalendar}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Connect
            </button>
          )}
        </div>

        {/* Sync Button */}
        {connected && (
          <div>
            <button
              onClick={syncWithGoogleCalendar}
              disabled={syncing}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Sync your tasks with Google Calendar to see them alongside your other events.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">How it works</h4>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <li>• Tasks with scheduled times will appear in your Google Calendar</li>
            <li>• Changes in DailyOrganiser will sync to Google Calendar</li>
            <li>• You can disconnect at any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

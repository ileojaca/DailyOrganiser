'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ExportData {
  profile: any;
  goals: any[];
  timeBlocks: any[];
  accomplishmentLogs: any[];
  teams: any[];
  exportedAt: string;
}

export default function DataExport() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const exportData = async () => {
    if (!user) return;

    try {
      setExporting(true);
      setMessage(null);

      const response = await fetch('/api/data/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dailyorganiser-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage({ type: 'success', text: 'Data exported successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to export data' });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setExporting(false);
    }
  };

  const requestDataDeletion = async () => {
    if (!user) return;

    if (!confirm('Are you sure you want to request data deletion? This action cannot be undone.')) {
      return;
    }

    try {
      setMessage(null);
      const response = await fetch('/api/data/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: 'Data deletion request submitted. You will receive a confirmation email within 24 hours.' 
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to submit deletion request' });
      }
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      setMessage({ type: 'error', text: 'Failed to submit deletion request' });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Data Export & Privacy</h2>

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
        {/* Data Export */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Export Your Data</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Download all your data in JSON format, including goals, time blocks, accomplishment logs, and team information.
          </p>
          <button
            onClick={exportData}
            disabled={exporting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        {/* Data Deletion */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Request Data Deletion</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Request complete deletion of all your data. This action cannot be undone and will be processed within 30 days.
          </p>
          <button
            onClick={requestDataDeletion}
            className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Request Data Deletion
          </button>
        </div>

        {/* Privacy Info */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Privacy Information</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <p>• Your data is stored securely and encrypted at rest</p>
            <p>• We do not sell or share your personal data with third parties</p>
            <p>• You can request data export or deletion at any time</p>
            <p>• Data retention policies are applied automatically</p>
          </div>
        </div>
      </div>
    </div>
  );
}

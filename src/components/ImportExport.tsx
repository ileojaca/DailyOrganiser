'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ExportData {
  goals: any[];
  timeBlocks: any[];
  accomplishmentLogs: any[];
  exportedAt: string;
  version: string;
}

export default function ImportExport() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
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
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dailyorganiser-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.length) return;

    const file = event.target.files[0];
    if (!file.name.endsWith('.json')) {
      setMessage({ type: 'error', text: 'Please select a JSON file' });
      return;
    }

    try {
      setImporting(true);
      setMessage(null);

      const text = await file.text();
      const data = JSON.parse(text) as ExportData;

      const response = await fetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ 
          type: 'success', 
          text: `Imported ${result.goalsCount} goals, ${result.timeBlocksCount} time blocks, and ${result.logsCount} logs` 
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to import data' });
      }
    } catch (error) {
      console.error('Error importing data:', error);
      setMessage({ type: 'error', text: 'Failed to import data. Please check the file format.' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Import & Export</h2>

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
        {/* Export Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Export Data</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Download all your goals, time blocks, and accomplishment logs as a JSON file.
          </p>
          <button
            onClick={exportData}
            disabled={exporting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        {/* Import Section */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Import Data</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Import goals, time blocks, and logs from a previously exported JSON file.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={importData}
            disabled={importing}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? 'Importing...' : 'Import Data'}
          </button>
        </div>

        {/* Export Format Info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Export Format</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The exported file contains all your data in JSON format, including goals, time blocks, 
            and accomplishment logs. You can use this file to back up your data or import it into 
            another DailyOrganiser account.
          </p>
        </div>
      </div>
    </div>
  );
}

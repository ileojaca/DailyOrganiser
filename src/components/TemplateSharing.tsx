'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SharedTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tasks: {
    title: string;
    description?: string;
    priority: number;
    estimatedDuration: number;
    energyRequired: number;
  }[];
  createdBy: string;
  createdByName: string;
  sharedAt: string;
  usageCount: number;
}

export default function TemplateSharing() {
  const { user } = useAuth();
  const [sharedTemplates, setSharedTemplates] = useState<SharedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSharedTemplates();
  }, [user]);

  const loadSharedTemplates = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/templates/shared');
      if (response.ok) {
        const data = await response.json();
        setSharedTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading shared templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const useSharedTemplate = async (template: SharedTemplate) => {
    if (!user) return;

    try {
      setMessage(null);
      const response = await fetch('/api/templates/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Created ${template.tasks.length} tasks from "${template.name}"!` });
      } else {
        setMessage({ type: 'error', text: 'Failed to use template' });
      }
    } catch (error) {
      console.error('Error using template:', error);
      setMessage({ type: 'error', text: 'Failed to use template' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Shared Templates</h2>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {sharedTemplates.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No shared templates available yet.
        </div>
      ) : (
        <div className="space-y-4">
          {sharedTemplates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{template.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      {template.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {template.tasks.length} tasks
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Used {template.usageCount} times
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      by {template.createdByName}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => useSharedTemplate(template)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TaskTemplate {
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
}

const BUILT_IN_TEMPLATES: TaskTemplate[] = [
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    description: 'Start your day with a productive morning routine',
    category: 'personal',
    tasks: [
      { title: 'Morning meditation', priority: 3, estimatedDuration: 15, energyRequired: 3 },
      { title: 'Review daily goals', priority: 4, estimatedDuration: 10, energyRequired: 4 },
      { title: 'Check emails', priority: 3, estimatedDuration: 20, energyRequired: 4 },
      { title: 'Plan top 3 priorities', priority: 5, estimatedDuration: 15, energyRequired: 5 },
    ],
  },
  {
    id: 'deep-work-session',
    name: 'Deep Work Session',
    description: 'Focused work block for complex tasks',
    category: 'work',
    tasks: [
      { title: 'Prepare workspace', priority: 3, estimatedDuration: 5, energyRequired: 3 },
      { title: 'Deep focus work', priority: 5, estimatedDuration: 90, energyRequired: 8 },
      { title: 'Short break', priority: 2, estimatedDuration: 10, energyRequired: 2 },
      { title: 'Review progress', priority: 3, estimatedDuration: 10, energyRequired: 4 },
    ],
  },
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    description: 'Reflect on the past week and plan ahead',
    category: 'planning',
    tasks: [
      { title: 'Review completed tasks', priority: 4, estimatedDuration: 15, energyRequired: 4 },
      { title: 'Analyze productivity patterns', priority: 3, estimatedDuration: 10, energyRequired: 5 },
      { title: 'Set goals for next week', priority: 5, estimatedDuration: 20, energyRequired: 6 },
      { title: 'Update project timelines', priority: 4, estimatedDuration: 15, energyRequired: 5 },
    ],
  },
  {
    id: 'health-wellness',
    name: 'Health & Wellness',
    description: 'Daily health and wellness activities',
    category: 'health',
    tasks: [
      { title: 'Morning exercise', priority: 4, estimatedDuration: 30, energyRequired: 6 },
      { title: 'Healthy meal prep', priority: 3, estimatedDuration: 20, energyRequired: 4 },
      { title: 'Evening walk', priority: 3, estimatedDuration: 20, energyRequired: 3 },
      { title: 'Sleep preparation', priority: 4, estimatedDuration: 15, energyRequired: 2 },
    ],
  },
  {
    id: 'learning-session',
    name: 'Learning Session',
    description: 'Dedicated time for learning and skill development',
    category: 'learning',
    tasks: [
      { title: 'Read documentation', priority: 4, estimatedDuration: 30, energyRequired: 6 },
      { title: 'Practice exercises', priority: 4, estimatedDuration: 45, energyRequired: 7 },
      { title: 'Take notes', priority: 3, estimatedDuration: 15, energyRequired: 5 },
      { title: 'Review and summarize', priority: 3, estimatedDuration: 15, energyRequired: 5 },
    ],
  },
  {
    id: 'team-meeting',
    name: 'Team Meeting',
    description: 'Structured team meeting template',
    category: 'work',
    tasks: [
      { title: 'Meeting preparation', priority: 4, estimatedDuration: 10, energyRequired: 4 },
      { title: 'Team sync meeting', priority: 5, estimatedDuration: 30, energyRequired: 5 },
      { title: 'Action items review', priority: 4, estimatedDuration: 10, energyRequired: 4 },
      { title: 'Follow-up tasks', priority: 3, estimatedDuration: 15, energyRequired: 4 },
    ],
  },
];

export default function TaskTemplates() {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const createTasksFromTemplate = async (template: TaskTemplate) => {
    if (!user) return;

    try {
      setCreating(true);
      setMessage(null);

      const response = await fetch('/api/templates/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Created ${template.tasks.length} tasks from "${template.name}" template!` });
        setSelectedTemplate(null);
      } else {
        setMessage({ type: 'error', text: 'Failed to create tasks from template' });
      }
    } catch (error) {
      console.error('Error creating tasks from template:', error);
      setMessage({ type: 'error', text: 'Failed to create tasks from template' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Task Templates</h2>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BUILT_IN_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors cursor-pointer"
            onClick={() => setSelectedTemplate(template)}
          >
            <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{template.description}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                {template.category}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {template.tasks.length} tasks
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedTemplate.name}</h3>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{selectedTemplate.description}</p>

            <div className="space-y-3 mb-6">
              {selectedTemplate.tasks.map((task, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{task.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{task.estimatedDuration} min</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">Energy: {task.energyRequired}/10</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createTasksFromTemplate(selectedTemplate)}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create Tasks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

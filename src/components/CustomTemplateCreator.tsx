'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TemplateTask {
  title: string;
  description?: string;
  priority: number;
  estimatedDuration: number;
  energyRequired: number;
}

interface CustomTemplate {
  name: string;
  description: string;
  category: string;
  tasks: TemplateTask[];
}

export default function CustomTemplateCreator() {
  const { user } = useAuth();
  const [template, setTemplate] = useState<CustomTemplate>({
    name: '',
    description: '',
    category: 'work',
    tasks: [{ title: '', priority: 3, estimatedDuration: 30, energyRequired: 5 }],
  });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const addTask = () => {
    setTemplate(prev => ({
      ...prev,
      tasks: [...prev.tasks, { title: '', priority: 3, estimatedDuration: 30, energyRequired: 5 }],
    }));
  };

  const removeTask = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  };

  const updateTask = (index: number, field: keyof TemplateTask, value: string | number) => {
    setTemplate(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      ),
    }));
  };

  const createTemplate = async () => {
    if (!user || !template.name.trim() || template.tasks.length === 0) return;

    try {
      setCreating(true);
      setMessage(null);

      const response = await fetch('/api/templates/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Template created successfully!' });
        setTemplate({
          name: '',
          description: '',
          category: 'work',
          tasks: [{ title: '', priority: 3, estimatedDuration: 30, energyRequired: 5 }],
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to create template' });
      }
    } catch (error) {
      console.error('Error creating template:', error);
      setMessage({ type: 'error', text: 'Failed to create template' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Create Custom Template</h2>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Template Name *
          </label>
          <input
            type="text"
            value={template.name}
            onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., My Morning Routine"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={template.description}
            onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your template..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <select
            value={template.category}
            onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="health">Health</option>
            <option value="learning">Learning</option>
            <option value="planning">Planning</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tasks *
            </label>
            <button
              onClick={addTask}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              + Add Task
            </button>
          </div>

          <div className="space-y-3">
            {template.tasks.map((task, index) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Task {index + 1}</span>
                  {template.tasks.length > 1 && (
                    <button
                      onClick={() => removeTask(index)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => updateTask(index, 'title', e.target.value)}
                  placeholder="Task title"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white mb-2"
                />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Priority</label>
                    <select
                      value={task.priority}
                      onChange={(e) => updateTask(index, 'priority', parseInt(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
                    >
                      {[1, 2, 3, 4, 5].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Duration (min)</label>
                    <input
                      type="number"
                      value={task.estimatedDuration}
                      onChange={(e) => updateTask(index, 'estimatedDuration', parseInt(e.target.value))}
                      min={5}
                      max={480}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Energy</label>
                    <select
                      value={task.energyRequired}
                      onChange={(e) => updateTask(index, 'energyRequired', parseInt(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={createTemplate}
        disabled={creating || !template.name.trim() || template.tasks.some(t => !t.title.trim())}
        className="mt-6 w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {creating ? 'Creating...' : 'Create Template'}
      </button>
    </div>
  );
}

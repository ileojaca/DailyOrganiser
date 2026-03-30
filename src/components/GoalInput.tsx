'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { parseTaskInput } from '@/utils/nlpTaskParser';

interface GoalFormData {
  title: string;
  description: string;
  category: 'work' | 'personal' | 'health' | 'learning' | 'social';
  priority: number;
  estimatedDuration: number;
  deadline: string;
  energyRequired: number;
  context: { location: string; tools: string[]; networkStatus: string };
}

const INITIAL: GoalFormData = {
  title: '', description: '', category: 'personal', priority: 3,
  estimatedDuration: 60, deadline: '', energyRequired: 5,
  context: { location: 'home', tools: ['computer'], networkStatus: 'online' },
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Minimal', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  2: { label: 'Low', color: 'bg-blue-50 text-blue-700 border-blue-300' },
  3: { label: 'Medium', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  4: { label: 'High', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  5: { label: 'Critical', color: 'bg-red-50 text-red-700 border-red-300' },
};

const CATEGORIES = [
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'personal', label: 'Personal', icon: '🏠' },
  { value: 'health', label: 'Health', icon: '💪' },
  { value: 'learning', label: 'Learning', icon: '📚' },
  { value: 'social', label: 'Social', icon: '👥' },
];

const ENERGY_LEVELS = [
  { value: 1, label: 'Very Low' }, { value: 3, label: 'Low' },
  { value: 5, label: 'Medium' }, { value: 7, label: 'High' }, { value: 9, label: 'Very High' },
];

export default function GoalInput() {
  const { user } = useAuth();
  const { createGoal } = useGoals(user?.uid);
  const [formData, setFormData] = useState<GoalFormData>(INITIAL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [expanded, setExpanded] = useState(false);
  const [isNLPMode, setIsNLPMode] = useState(false);
  const [nlpInput, setNlpInput] = useState('');

  const set = (field: keyof GoalFormData, value: unknown) =>
    setFormData((p) => ({ ...p, [field]: value }));

  const setCtx = (field: string, value: unknown) =>
    setFormData((p) => ({ ...p, context: { ...p.context, [field]: value } }));

  const handleNLPParse = () => {
    if (!nlpInput.trim()) return;
    const parsed = parseTaskInput(nlpInput);
    setFormData({
      ...INITIAL,
      title: parsed.title,
      description: '',
      category: parsed.category || 'personal',
      priority: parsed.priority || 3,
      estimatedDuration: parsed.duration || 60,
      deadline: parsed.deadline ? parsed.deadline.toISOString().slice(0, 16) : '',
      energyRequired: parsed.energyRequired || 5,
      context: { 
        location: parsed.context?.location || 'home', 
        tools: parsed.context?.tools || ['computer'], 
        networkStatus: parsed.context?.networkStatus || 'online' 
      },
    });
    setIsNLPMode(false);
    setExpanded(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setStatus('idle');
    try {
      await createGoal({
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category,
        priority: formData.priority,
        estimatedDuration: formData.estimatedDuration,
        deadline: formData.deadline ? new Date(formData.deadline) : undefined,
        energyRequired: formData.energyRequired,
        context: formData.context,
      });
      setStatus('success');
      setFormData(INITIAL);
      setExpanded(false);
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
        <h2 className="text-lg font-semibold text-white">Add Goal</h2>
        <p className="text-indigo-100 text-xs mt-0.5">Define your task with priority and context</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* NLP Mode Toggle */}
        <div className="flex items-center justify-end mb-2">
          <button
            type="button"
            onClick={() => setIsNLPMode(!isNLPMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              isNLPMode 
                ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                : 'bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Input
          </button>
        </div>

        {isNLPMode ? (
          <div className="space-y-2">
            <textarea
              value={nlpInput}
              onChange={(e) => setNlpInput(e.target.value)}
              placeholder="Try: 'Schedule 30min workout tomorrow at 7am, high priority, for health'"
              className="w-full px-4 py-2.5 rounded-lg border border-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 placeholder-gray-400 text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleNLPParse}
                disabled={!nlpInput.trim()}
                className="flex-1 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                Parse with AI
              </button>
              <button
                type="button"
                onClick={() => setIsNLPMode(false)}
                className="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => set('title', e.target.value)}
              onFocus={() => setExpanded(true)}
              placeholder="What do you want to accomplish?"
              maxLength={100}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{formData.title.length}/100</p>
          </div>
        )}

        {expanded && (
          <>
            <textarea
              value={formData.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Add details (optional)..."
              maxLength={500}
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400 resize-none text-sm"
            />

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => set('category', cat.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      formData.category === cat.value
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span>{cat.icon}</span>{cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Priority</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => {
                  const p = PRIORITY_LABELS[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => set('priority', level)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        formData.priority === level
                          ? `${p.color} ring-2 ring-indigo-400 ring-offset-1`
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {level}
                      <span className="block text-[10px] font-normal">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration (min)</label>
                <input
                  type="number"
                  value={formData.estimatedDuration}
                  onChange={(e) => set('estimatedDuration', parseInt(e.target.value) || 15)}
                  min={15} max={480} step={15}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Energy</label>
                <select
                  value={formData.energyRequired}
                  onChange={(e) => set('energyRequired', parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                >
                  {ENERGY_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.value} – {l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Deadline</label>
                <input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => set('deadline', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                <select
                  value={formData.context.location}
                  onChange={(e) => setCtx('location', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                >
                  <option value="home">🏠 Home</option>
                  <option value="office">🏢 Office</option>
                  <option value="commute">🚌 Commute</option>
                  <option value="cafe">☕ Cafe</option>
                  <option value="gym">💪 Gym</option>
                  <option value="outdoors">🌳 Outdoors</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Network</label>
                <select
                  value={formData.context.networkStatus}
                  onChange={(e) => setCtx('networkStatus', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                >
                  <option value="online">🌐 Online</option>
                  <option value="offline">📴 Offline</option>
                  <option value="limited">📶 Limited</option>
                </select>
              </div>
            </div>
          </>
        )}

        {status === 'success' && (
          <p className="text-green-600 text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Goal added!
          </p>
        )}
        {status === 'error' && (
          <p className="text-red-600 text-sm">Failed to create goal. Try again.</p>
        )}

        <div className="flex gap-2 pt-1">
          {expanded && (
            <button
              type="button"
              onClick={() => { setFormData(INITIAL); setExpanded(false); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !formData.title.trim()}
            className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            {isSubmitting ? 'Adding...' : 'Add Goal'}
          </button>
        </div>
      </form>
    </div>
  );
}

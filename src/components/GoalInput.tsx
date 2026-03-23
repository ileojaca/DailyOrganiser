'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface GoalFormData {
  title: string;
  description: string;
  category: 'work' | 'personal' | 'health' | 'learning' | 'social';
  priority: number;
  estimatedDuration: number;
  deadline: string;
  energyRequired: number;
  context: {
    location: string;
    tools: string[];
    networkStatus: string;
  };
}

const INITIAL_FORM_DATA: GoalFormData = {
  title: '',
  description: '',
  category: 'personal',
  priority: 3,
  estimatedDuration: 60,
  deadline: '',
  energyRequired: 5,
  context: {
    location: 'home',
    tools: ['computer'],
    networkStatus: 'online',
  },
};

const PRIORITY_LABELS: Record<number, { label: string; color: string; description: string }> = {
  1: { label: 'Minimal', color: 'bg-gray-100 text-gray-700 border-gray-300', description: 'Optional; can be postponed indefinitely' },
  2: { label: 'Low', color: 'bg-blue-50 text-blue-700 border-blue-300', description: 'Nice to have; minimal impact' },
  3: { label: 'Medium', color: 'bg-yellow-50 text-yellow-700 border-yellow-300', description: 'Standard priority; flexible timing' },
  4: { label: 'High', color: 'bg-orange-50 text-orange-700 border-orange-300', description: 'Important for progress; noticeable impact' },
  5: { label: 'Critical', color: 'bg-red-50 text-red-700 border-red-300', description: 'Must complete today; significant consequences' },
};

const CATEGORIES = [
  { value: 'work', label: 'Work', icon: '💼', color: 'bg-purple-100 text-purple-700' },
  { value: 'personal', label: 'Personal', icon: '🏠', color: 'bg-green-100 text-green-700' },
  { value: 'health', label: 'Health', icon: '💪', color: 'bg-red-100 text-red-700' },
  { value: 'learning', label: 'Learning', icon: '📚', color: 'bg-blue-100 text-blue-700' },
  { value: 'social', label: 'Social', icon: '👥', color: 'bg-yellow-100 text-yellow-700' },
];

const ENERGY_LEVELS = [
  { value: 1, label: 'Very Low', description: 'Rest, passive activities only' },
  { value: 3, label: 'Low', description: 'Routine tasks, light admin' },
  { value: 5, label: 'Medium', description: 'Standard work, communication' },
  { value: 7, label: 'High', description: 'Creative work, problem solving' },
  { value: 9, label: 'Very High', description: 'Deep work, complex analysis' },
];

export default function GoalInput() {
  const [formData, setFormData] = useState<GoalFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (field: keyof GoalFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleContextChange = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      context: { ...prev.context, [field]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Get current user (in real app, this would come from auth context)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const goalData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        estimated_duration: formData.estimatedDuration,
        deadline: formData.deadline || null,
        energy_required: formData.energyRequired,
        context: formData.context,
        status: 'pending',
      };

      const { error } = await supabase.from('goals').insert(goalData);

      if (error) throw error;

      setSubmitStatus('success');
      setFormData(INITIAL_FORM_DATA);
    } catch (error) {
      console.error('Error submitting goal:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Create New Goal</h2>
          <p className="text-indigo-100 text-sm mt-1">
            Define your task with importance levels and time constraints
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Complete project proposal"
                maxLength={100}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Add details about this goal..."
                maxLength={500}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-400 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 characters</p>
            </div>
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleInputChange('category', cat.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                      formData.category === cat.value
                        ? `${cat.color} border-current ring-2 ring-offset-1 ring-indigo-500`
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Importance Level
              </label>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((level) => {
                  const priority = PRIORITY_LABELS[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleInputChange('priority', level)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                        formData.priority === level
                          ? `${priority.color} ring-2 ring-offset-1 ring-indigo-500`
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        formData.priority === level ? 'bg-white/50' : 'bg-gray-100'
                      }`}>
                        {level}
                      </span>
                      <div className="flex-1 text-left">
                        <span className="font-medium text-sm">{priority.label}</span>
                        <p className="text-xs opacity-75">{priority.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time Constraints */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Time Constraints
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Duration
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.estimatedDuration}
                    onChange={(e) => handleInputChange('estimatedDuration', parseInt(e.target.value) || 0)}
                    min={15}
                    max={480}
                    step={15}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">min</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">15 min - 8 hours</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Energy Required
                </label>
                <select
                  value={formData.energyRequired}
                  onChange={(e) => handleInputChange('energyRequired', parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  {ENERGY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.value}/10 - {level.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {ENERGY_LEVELS.find(l => l.value === formData.energyRequired)?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Context Section */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Context (Optional)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={formData.context.location}
                  onChange={(e) => handleContextChange('location', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Network</label>
                <select
                  value={formData.context.networkStatus}
                  onChange={(e) => handleContextChange('networkStatus', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                >
                  <option value="online">🌐 Online</option>
                  <option value="offline">📴 Offline</option>
                  <option value="limited">📶 Limited</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Available Tools</label>
                <div className="flex flex-wrap gap-2">
                  {['Computer', 'Phone', 'Paper', 'Whiteboard'].map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => {
                        const current = formData.context.tools;
                        const updated = current.includes(tool)
                          ? current.filter((t) => t !== tool)
                          : [...current, tool];
                        handleContextChange('tools', updated);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        formData.context.tools.includes(tool)
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              {submitStatus === 'success' && (
                <p className="text-green-600 text-sm flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Goal created successfully!
                </p>
              )}
              {submitStatus === 'error' && (
                <p className="text-red-600 text-sm flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Failed to create goal. Please try again.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData(INITIAL_FORM_DATA)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim()}
                className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Goal
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

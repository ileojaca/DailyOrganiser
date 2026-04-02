'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import GoalInput from '@/components/GoalInput';
import TaskDashboard from '@/components/TaskDashboard';
import AISuggestions from '@/components/AISuggestions';
import LifeDashboard from '@/components/LifeDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';

export default function Home() {
  const { profile, user } = useAuth();
  const { goals, createGoal } = useGoals(user?.uid);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [demoLoading, setDemoLoading] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = profile?.fullName?.split(' ')[0] || 'there';

  useEffect(() => {
    if (goals.length === 0 && !showOnboarding) {
      setShowOnboarding(true);
    }
  }, [goals.length, showOnboarding]);

  const addDemoGoals = async () => {
    setDemoLoading(true);
    try {
      await createGoal({ title: 'Buy groceries', category: 'personal', priority: 3, estimatedDuration: 60, energyRequired: 5 });
      await createGoal({ title: 'Prepare team meeting notes', category: 'work', priority: 4, estimatedDuration: 45, energyRequired: 6 });
      await createGoal({ title: 'Evening workout', category: 'health', priority: 2, estimatedDuration: 30, energyRequired: 7 });
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to add demo goals', error);
    } finally {
      setDemoLoading(false);
    }
  };

  const onboardingSteps = [
    {
      title: 'Welcome to DailyOrganiser!',
      content: 'Your AI-powered planner to stay productive and balanced. Let\'s get you started.',
      action: 'Next',
    },
    {
      title: 'Add Your First Goal',
      content: 'Use the form on the left to add a task. Try the AI input for natural language!',
      action: 'Next',
    },
    {
      title: 'Plan Your Week',
      content: 'Visit the Planner page to schedule tasks and see your weekly overview.',
      action: 'Next',
    },
    {
      title: 'Focus & Track',
      content: 'Use the Focus timer to work distraction-free and track your accomplishments.',
      action: 'Get Started',
    },
  ];

  const nextStep = () => {
    if (onboardingStep < onboardingSteps.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      setShowOnboarding(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, {name} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Quick Start for new users */}
        {goals.length === 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
            <h3 className="font-bold text-gray-900 mb-3">🚀 Get Started in 3 Steps</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex gap-3">
                <span className="text-lg font-bold text-indigo-600">1</span>
                <div>
                  <p className="font-semibold text-gray-900">Add a Goal</p>
                  <p className="text-xs text-gray-600">Use the form on the left to create your first task</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-lg font-bold text-indigo-600">2</span>
                <div>
                  <p className="font-semibold text-gray-900">Plan Your Week</p>
                  <p className="text-xs text-gray-600">Visit Planner to schedule goals across your week</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-lg font-bold text-indigo-600">3</span>
                <div>
                  <p className="font-semibold text-gray-900">Focus & Track</p>
                  <p className="text-xs text-gray-600">Use Focus timer for distraction-free work sessions</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left: Goal input + AI suggestions */}
          <div className="xl:col-span-1 space-y-6">
            <GoalInput />
            <AISuggestions />
          </div>

          {/* Center: Task dashboard */}
          <div className="xl:col-span-2">
            <TaskDashboard />
          </div>

          {/* Right: Life dashboard */}
          <div className="xl:col-span-1">
            <LifeDashboard />
          </div>
        </div>
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{onboardingSteps[onboardingStep].title}</h2>
              <p className="text-gray-600 mb-6">{onboardingSteps[onboardingStep].content}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="px-4 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Skip
                </button>
                <button
                  onClick={addDemoGoals}
                  disabled={demoLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {demoLoading ? 'Adding...' : 'Add Demo Tasks'}
                </button>
                <button
                  onClick={nextStep}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {onboardingSteps[onboardingStep].action}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

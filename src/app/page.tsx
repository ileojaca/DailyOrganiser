'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import GoalInput from '@/components/GoalInput';
import TaskDashboard from '@/components/TaskDashboard';
import AISuggestions from '@/components/AISuggestions';
import LifeDashboard from '@/components/LifeDashboard';
import EnergyTracker from '@/components/EnergyTracker';
import HabitStreaks from '@/components/HabitStreaks';
import ProductivityChallenges from '@/components/ProductivityChallenges';
import OnboardingFlow from '@/components/OnboardingFlow';
import LandingPage from '@/components/LandingPage';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';

export default function Home() {
  const { profile, user } = useAuth();
  const { goals, createGoal } = useGoals(user?.uid);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [neverShowOnboarding, setNeverShowOnboarding] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = profile?.fullName?.split(' ')[0] || 'there';

  useEffect(() => {
    const savedPreference = localStorage.getItem('dailyOrganiserNeverShowOnboarding') === 'true';
    setNeverShowOnboarding(savedPreference);

    if (!savedPreference && goals.length === 0 && !showOnboarding) {
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

  const completeOnboarding = () => {
    setShowOnboarding(false);
    setNeverShowOnboarding(true);
    localStorage.setItem('dailyOrganiserNeverShowOnboarding', 'true');
  };

  // If user is not authenticated, show landing page
  if (!user) {
    return <LandingPage />;
  }

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
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowOnboarding(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
              >
                Start Guided Setup
              </button>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-6">
          {/* Left: Goal input + AI suggestions */}
          <div className="xl:col-span-1 space-y-6">
            <GoalInput />
            <AISuggestions />
          </div>

          {/* Center: Task dashboard + Habit streaks + Challenges */}
          <div className="xl:col-span-4 space-y-6">
            <TaskDashboard />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HabitStreaks />
              <ProductivityChallenges />
            </div>
          </div>

          {/* Right: Life dashboard + Energy tracker */}
          <div className="xl:col-span-2 space-y-6">
            <LifeDashboard />
            <EnergyTracker />
          </div>
        </div>
      </div>

      {/* New multi-step onboarding flow */}
      {showOnboarding && (
        <OnboardingFlow onComplete={completeOnboarding} />
      )}
    </AppShell>
  );
}

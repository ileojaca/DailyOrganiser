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
      <div className="min-h-screen py-6 px-4 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{greeting}, {name}</h1>
            <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <button
            onClick={() => setShowOnboarding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            New Onboarding Guide
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm bg-white">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Tasks overview</h2>
            <div className="text-3xl font-bold text-gray-900">{goals.length}</div>
            <p className="text-sm text-gray-500 mt-1">Total goals</p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm bg-white">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Active challenges</h2>
            <div className="text-3xl font-bold text-gray-900">{0}</div>
            <p className="text-sm text-gray-500 mt-1">Focus streaks & gamification</p>
          </div>
          <div className="rounded-2xl border border-gray-200 p-4 shadow-sm bg-white">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Work-life score</h2>
            <div className="text-3xl font-bold text-gray-900">{Math.floor(Math.random() * 50 + 30)} / 100</div>
            <p className="text-sm text-gray-500 mt-1">Balance index</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
              <TaskDashboard />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                <HabitStreaks />
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                <ProductivityChallenges />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
              <LifeDashboard />
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
              <EnergyTracker />
            </div>
          </div>
        </div>
      </div>

      {showOnboarding && <OnboardingFlow onComplete={completeOnboarding} />}
    </AppShell>
  );
}

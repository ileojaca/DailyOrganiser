'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { getDb } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type StepType = 'welcome' | 'features' | 'first_task' | 'complete';

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const { createGoal } = useGoals(user?.uid);
  const [currentStep, setCurrentStep] = useState<StepType>('welcome');
  const [prevStep, setPrevStep] = useState<StepType>('welcome');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<'work' | 'personal' | 'health' | 'learning' | 'social' | 'family'>('personal');
  const [taskPriority, setTaskPriority] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const neverShow = localStorage.getItem('dailyOrganiserNeverShowOnboarding') === 'true';
    if (neverShow) {
      onComplete();
    }
  }, [onComplete]);

  const handleNext = async () => {
    setPrevStep(currentStep);
    if (currentStep === 'welcome') {
      setCurrentStep('features');
    } else if (currentStep === 'features') {
      setCurrentStep('first_task');
    } else if (currentStep === 'first_task') {
      if (!taskTitle.trim()) return;
      setIsSubmitting(true);
      try {
        await createGoal({
          title: taskTitle.trim(),
          category: taskCategory,
          priority: taskPriority,
          estimatedDuration: 30,
          energyRequired: 5
        });
        setCurrentStep('complete');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSkip = () => {
    setPrevStep(currentStep);
    setCurrentStep('complete');
  };

  const handleComplete = async () => {
    if (!user) return;
    localStorage.setItem('dailyOrganiserNeverShowOnboarding', 'true');

    try {
      const db = getDb();
      await setDoc(
        doc(db, 'users', user.uid),
        {
          onboardingCompleted: true,
          onboardingCompletedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error saving onboarding completion:', err);
    }

    onComplete();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center">
            <div className="inline-block mb-6 p-4 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)' }}>
              <div className="text-6xl">🎯</div>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to DailyOrganiser!
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Your personal AI assistant to stay organized and on track.
            </p>
          </div>
        );

      case 'features':
        return (
          <div className="text-center">
            <div className="inline-block mb-6 p-4 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)' }}>
              <div className="text-6xl">✨</div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Here's how we help
            </h2>
            <div className="space-y-4 max-w-sm mx-auto">
              <div className="flex items-start gap-4 text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <span className="text-3xl flex-shrink-0">📝</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Capture</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Add your tasks and goals</p>
                </div>
              </div>
              <div className="flex items-start gap-4 text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <span className="text-3xl flex-shrink-0">⏱️</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Focus</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Deep work with the Pomodoro timer</p>
                </div>
              </div>
              <div className="flex items-start gap-4 text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <span className="text-3xl flex-shrink-0">🧠</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">AI Insights</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get smart recommendations and briefings</p>
                </div>
              </div>
              <div className="flex items-start gap-4 text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <span className="text-3xl flex-shrink-0">💤</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Track Health</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Monitor sleep, energy, and habits</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'first_task':
        return (
          <div>
            <div className="text-center mb-8">
              <div className="inline-block mb-6 p-4 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)' }}>
                <div className="text-6xl">🚀</div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Let's create your first task
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Get started with your first goal
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What's your first goal?
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Complete project proposal"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': 'color-mix(in srgb, var(--accent-color) 30%, transparent)' } as React.CSSProperties}
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as typeof taskCategory)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    disabled={isSubmitting}
                  >
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="health">Health</option>
                    <option value="learning">Learning</option>
                    <option value="social">Social</option>
                    <option value="family">Family</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    disabled={isSubmitting}
                  >
                    <option value="1">Low</option>
                    <option value="2">Normal</option>
                    <option value="3">Medium</option>
                    <option value="4">High</option>
                    <option value="5">Critical</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center">
            <div className="inline-block mb-6 p-4 rounded-full" style={{ background: 'color-mix(in srgb, var(--accent-color) 10%, transparent)' }}>
              <div className="text-6xl">✓</div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              You're all set!
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
              Your dashboard is ready. Let's stay on track.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const stepNumber = currentStep === 'welcome' ? 1 : currentStep === 'features' ? 2 : currentStep === 'first_task' ? 3 : 4;
  const totalSteps = 4;
  const progress = (stepNumber / totalSteps) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-8 lg:p-10">
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span>Step {stepNumber} of {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: 'var(--accent-color)' }}
              />
            </div>
          </div>

          <div className="min-h-[360px] flex flex-col justify-center">
            {renderStepContent()}
          </div>

          <div className="flex gap-3 mt-10">
            {currentStep === 'first_task' && (
              <button
                onClick={handleSkip}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Skip
              </button>
            )}
            <button
              onClick={currentStep === 'complete' ? handleComplete : handleNext}
              disabled={(currentStep === 'first_task' && !taskTitle.trim()) || isSubmitting}
              className="flex-1 px-4 py-3 text-white font-semibold rounded-lg transition-opacity disabled:opacity-50"
              style={{ background: 'var(--accent-color)' }}
            >
              {currentStep === 'complete' ? "Let's Go!" : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

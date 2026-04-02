'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { OnboardingStep, OnboardingProgress } from '@/types/lifeManagement';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to DailyOrganiser!',
      description: 'Let\'s set up your personalized life management system in just a few steps.',
      component: 'welcome',
      completed: false,
      optional: false,
      order: 1,
    },
    {
      id: 'chronotype',
      title: 'What\'s your chronotype?',
      description: 'Understanding your natural rhythm helps us schedule tasks at optimal times.',
      component: 'chronotype',
      completed: false,
      optional: false,
      order: 2,
    },
    {
      id: 'priorities',
      title: 'What are your main priorities?',
      description: 'Select the areas of life you want to focus on improving.',
      component: 'priorities',
      completed: false,
      optional: false,
      order: 3,
    },
    {
      id: 'family',
      title: 'Family goals',
      description: 'Tell us how your family time should fit into your schedule.',
      component: 'family',
      completed: false,
      optional: true,
      order: 4,
    },
    {
      id: 'worklife',
      title: 'Work-life balance',
      description: 'Set your target work vs rest ratio to keep you healthy.',
      component: 'worklife',
      completed: false,
      optional: true,
      order: 5,
    },
    {
      id: 'goals',
      title: 'Set your first goal',
      description: 'Start with one achievable goal to build momentum.',
      component: 'goals',
      completed: false,
      optional: true,
      order: 6,
    },
    {
      id: 'complete',
      title: 'You\'re all set!',
      description: 'Your personalized life management system is ready to use.',
      component: 'complete',
      completed: false,
      optional: false,
      order: 5,
    },
  ];

  useEffect(() => {
    if (!user) return;

    // Check if onboarding is already completed
    const saved = localStorage.getItem(`onboarding_${user.uid}`);
    if (saved) {
      const savedProgress = JSON.parse(saved);
      if (savedProgress.completedAt) {
        onComplete();
        return;
      }
      setProgress(savedProgress);
      setCurrentStep(savedProgress.currentStep);
    } else {
      const newProgress: OnboardingProgress = {
        userId: user.uid,
        currentStep: 0,
        completedSteps: [],
        startedAt: new Date(),
      };
      setProgress(newProgress);
      localStorage.setItem(`onboarding_${user.uid}`, JSON.stringify(newProgress));
    }
  }, [user, onComplete]);

  const nextStep = () => {
    if (!progress || !user) return;

    const updatedProgress: OnboardingProgress = {
      ...progress,
      currentStep: currentStep + 1,
      completedSteps: [...progress.completedSteps, steps[currentStep].id],
    };

    if (currentStep + 1 >= steps.length) {
      updatedProgress.completedAt = new Date();
      localStorage.setItem(`onboarding_${user.uid}`, JSON.stringify(updatedProgress));
      onComplete();
    } else {
      setProgress(updatedProgress);
      setCurrentStep(currentStep + 1);
      localStorage.setItem(`onboarding_${user.uid}`, JSON.stringify(updatedProgress));
    }
  };

  const skipStep = () => {
    if (!steps[currentStep].optional) return;
    nextStep();
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.component) {
      case 'welcome':
        return (
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {step.description}
            </p>
            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <span className="text-green-500">✓</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track your daily tasks and goals
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500">✓</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Balance work, family, and personal time
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500">✓</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get AI-powered insights and recommendations
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500">✓</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Build healthy habits and maintain balance
                </p>
              </div>
            </div>
          </div>
        );

      case 'chronotype':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {step.description}
            </p>
            <div className="space-y-3">
              {[
                { value: 'lark', label: '🌅 Early Bird (Lark)', desc: 'I\'m most productive in the morning' },
                { value: 'owl', label: '🦉 Night Owl', desc: 'I do my best work in the evening' },
                { value: 'intermediate', label: '🐦 Intermediate', desc: 'I\'m flexible throughout the day' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setAnswers({ ...answers, chronotype: option.value })}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    answers.chronotype === option.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'priorities':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {step.description}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'work', label: '💼 Work', desc: 'Career & productivity' },
                { value: 'health', label: '🏃 Health', desc: 'Fitness & wellness' },
                { value: 'family', label: '👨‍👩‍👧‍👦 Family', desc: 'Relationships' },
                { value: 'personal', label: '🌟 Personal', desc: 'Growth & hobbies' },
                { value: 'learning', label: '📚 Learning', desc: 'Skills & education' },
                { value: 'rest', label: '😴 Rest', desc: 'Sleep & recovery' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    const current = answers.priorities ? answers.priorities.split(',') : [];
                    const updated = current.includes(option.value)
                      ? current.filter(p => p !== option.value)
                      : [...current, option.value];
                    setAnswers({ ...answers, priorities: updated.join(',') });
                  }}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    answers.priorities?.includes(option.value)
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'family':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {step.description}
            </p>
            <div className="space-y-3">
              {[
                { value: 'daily', label: 'Daily family check-in', desc: 'Log family activities every day' },
                { value: 'weekly', label: 'Weekly family review', desc: 'Plan family time weekly' },
                { value: 'occasional', label: 'Occasional catch-ups', desc: 'Focus mainly on personal habits' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setAnswers({ ...answers, familyPlan: option.value })}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    answers.familyPlan === option.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'worklife':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {step.description}
            </p>
            <div className="space-y-3">
              {[
                { value: 'balanced', label: 'Balanced 50/50', desc: 'Equally split work and rest' },
                { value: 'focus', label: 'Focus of the week', desc: 'Higher work focus this week' },
                { value: 'recovery', label: 'Recovery first', desc: 'Prioritize rest and wellness' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setAnswers({ ...answers, worklifeBalance: option.value })}
                  className={`w-full p-4 rounded-lg border text-left transition-colors ${
                    answers.worklifeBalance === option.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{option.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'goals':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {step.description}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  What do you want to achieve?
                </label>
                <input
                  type="text"
                  value={answers.goalTitle || ''}
                  onChange={(e) => setAnswers({ ...answers, goalTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Exercise 3 times a week"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target date
                </label>
                <input
                  type="date"
                  value={answers.goalDate || ''}
                  onChange={(e) => setAnswers({ ...answers, goalDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {step.description}
            </p>
            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ Your profile is set up
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ Your schedule is optimized
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ AI insights are ready
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!progress) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-lg w-full mx-4">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {steps[currentStep].optional && (
            <button
              onClick={skipStep}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Skip
            </button>
          )}
          <button
            onClick={nextStep}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

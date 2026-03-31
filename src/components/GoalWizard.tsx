'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { GoalClarification, ClarificationQuestion } from '@/types/lifeManagement';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'work' | 'health' | 'personal' | 'family' | 'learning';
  targetDate: Date;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  tasks: string[];
  createdAt: Date;
}

export default function GoalWizard() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [clarification, setClarification] = useState<GoalClarification | null>(null);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'personal' as Goal['category'],
    targetDate: '',
  });

  useEffect(() => {
    if (!user) return;

    // Load from localStorage
    const saved = localStorage.getItem(`goals_${user.uid}`);
    if (saved) {
      setGoals(JSON.parse(saved));
    }
    setLoading(false);
  }, [user]);

  const addGoal = () => {
    if (!user || !newGoal.title) return;

    const goal: Goal = {
      id: `goal_${Date.now()}`,
      title: newGoal.title,
      description: newGoal.description,
      category: newGoal.category,
      targetDate: new Date(newGoal.targetDate),
      status: 'active',
      progress: 0,
      tasks: [],
      createdAt: new Date(),
    };

    const updated = [goal, ...goals];
    setGoals(updated);
    localStorage.setItem(`goals_${user.uid}`, JSON.stringify(updated));
    setShowAddGoal(false);
    setNewGoal({ title: '', description: '', category: 'personal', targetDate: '' });

    // Generate clarification questions
    generateClarification(goal);
  };

  const generateClarification = (goal: Goal) => {
    const questions: ClarificationQuestion[] = [
      {
        id: 'q1',
        question: 'What specific outcome would make this goal feel accomplished?',
        type: 'text',
        required: true,
      },
      {
        id: 'q2',
        question: 'How many hours per week can you dedicate to this goal?',
        type: 'select',
        options: ['1-2 hours', '3-5 hours', '6-10 hours', '10+ hours'],
        required: true,
      },
      {
        id: 'q3',
        question: 'What\'s the biggest obstacle you foresee?',
        type: 'text',
        required: false,
      },
      {
        id: 'q4',
        question: 'Do you have any dependencies on others?',
        type: 'select',
        options: ['No dependencies', 'Need feedback from someone', 'Need approval', 'Need collaboration'],
        required: false,
      },
    ];

    setClarification({
      goalId: goal.id,
      questions,
      answers: {},
      constraints: [],
      decomposedTasks: [],
      schedule: {
        goalId: goal.id,
        dailyBlocks: [],
        weeklyPattern: {
          monday: { workHours: 0, familyHours: 0, personalHours: 0, restHours: 0 },
          tuesday: { workHours: 0, familyHours: 0, personalHours: 0, restHours: 0 },
          wednesday: { workHours: 0, familyHours: 0, personalHours: 0, restHours: 0 },
          thursday: { workHours: 0, familyHours: 0, personalHours: 0, restHours: 0 },
          friday: { workHours: 0, familyHours: 0, personalHours: 0, restHours: 0 },
          saturday: { workHours: 0, familyHours: 0, personalHours: 0, restHours: 0 },
          sunday: { workHours: 0, familyHours: 0, personalHours: 0, restHours: 0 },
        },
        flexibility: 0.5,
        bufferTime: 15,
        reviewFrequency: 'weekly',
        autoAdjust: true,
        updatedAt: new Date(),
      },
      completed: false,
      createdAt: new Date(),
    });
  };

  const answerQuestion = (questionId: string, answer: string) => {
    if (!clarification) return;

    const updated = {
      ...clarification,
      answers: { ...clarification.answers, [questionId]: answer },
    };
    setClarification(updated);
  };

  const completeClarification = () => {
    if (!clarification || !user) return;

    // Generate decomposed tasks based on answers
    const tasks = [
      'Research and gather resources',
      'Create initial plan',
      'Set up tracking system',
      'Complete first milestone',
      'Review and adjust approach',
    ];

    const updatedClarification = {
      ...clarification,
      decomposedTasks: tasks,
      completed: true,
    };
    setClarification(updatedClarification);

    // Update goal with tasks
    const updatedGoals = goals.map(g =>
      g.id === clarification.goalId ? { ...g, tasks } : g
    );
    setGoals(updatedGoals);
    localStorage.setItem(`goals_${user.uid}`, JSON.stringify(updatedGoals));
  };

  const getCategoryIcon = (category: Goal['category']) => {
    const icons: Record<Goal['category'], string> = {
      work: '💼',
      health: '🏃',
      personal: '🌟',
      family: '👨‍👩‍👧‍👦',
      learning: '📚',
    };
    return icons[category];
  };

  const getCategoryColor = (category: Goal['category']) => {
    const colors: Record<Goal['category'], string> = {
      work: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      health: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      personal: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      family: 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
      learning: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    };
    return colors[category];
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Goal Wizard</h2>
        <button
          onClick={() => setShowAddGoal(true)}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Add Goal
        </button>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No goals yet. Start by adding your first goal!
          </p>
          <button
            onClick={() => setShowAddGoal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedGoal?.id === goal.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
              }`}
              onClick={() => setSelectedGoal(goal)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{goal.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {goal.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${getCategoryColor(goal.category)}`}>
                        {goal.category}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Due: {new Date(goal.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {goal.progress}%
                  </div>
                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tasks */}
              {goal.tasks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Decomposed Tasks:
                  </p>
                  <div className="space-y-1">
                    {goal.tasks.slice(0, 3).map((task, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-gray-400">•</span>
                        <span>{task}</span>
                      </div>
                    ))}
                    {goal.tasks.length > 3 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        +{goal.tasks.length - 3} more tasks
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Clarification Modal */}
      {clarification && !clarification.completed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Let's refine your goal
            </h3>
            <div className="space-y-6">
              {clarification.questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {q.question}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {q.type === 'text' && (
                    <textarea
                      value={clarification.answers[q.id] || ''}
                      onChange={(e) => answerQuestion(q.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={3}
                      placeholder="Your answer..."
                    />
                  )}
                  {q.type === 'select' && q.options && (
                    <select
                      value={clarification.answers[q.id] || ''}
                      onChange={(e) => answerQuestion(q.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select an option</option>
                      {q.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setClarification(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Skip
              </button>
              <button
                onClick={completeClarification}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Generate Tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add New Goal
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="What do you want to achieve?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Describe your goal in more detail..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as Goal['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="work">💼 Work</option>
                  <option value="health">🏃 Health</option>
                  <option value="personal">🌟 Personal</option>
                  <option value="family">👨‍👩‍👧‍👦 Family</option>
                  <option value="learning">📚 Learning</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddGoal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={addGoal}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

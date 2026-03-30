'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';
import { generatePlanningSuggestions, TaskContext } from '@/utils/contextAwarePlanning';

const ENERGY_LABELS: Record<number, string> = {
  1: 'Very Low', 2: 'Low', 3: 'Low', 4: 'Moderate', 5: 'Moderate',
  6: 'Moderate-High', 7: 'High', 8: 'High', 9: 'Very High', 10: 'Peak',
};

export default function AISuggestions() {
  const { user } = useAuth();
  const { goals } = useGoals(user?.uid);
  const [userEnergy, setUserEnergy] = useState(6);
  const [location, setLocation] = useState<TaskContext['location']>('home');
  const [network, setNetwork] = useState<TaskContext['networkStatus']>('online');
  const [showAll, setShowAll] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const suggestions = useMemo(() => {
    if (goals.length === 0) return [];
    const context: TaskContext = {
      location,
      tools: ['computer'],
      networkStatus: network,
      deviceType: 'desktop',
    };
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59);
    const timeBlocks = [{ start: now, end: endOfDay }];

    return generatePlanningSuggestions(
      goals.filter((g) => g.status !== 'completed' && g.status !== 'cancelled').map((g) => ({
        id: g.id,
        title: g.title,
        priority: g.priority,
        estimatedDuration: g.estimatedDuration || 60,
        energyRequired: g.energyRequired || 5,
        category: g.category,
        status: (g.status === 'deferred' ? 'pending' : g.status) as 'pending' | 'in_progress' | 'completed' | 'cancelled',
        deadline: g.deadline,
      })),
      userEnergy,
      context,
      timeBlocks
    );
  }, [goals, userEnergy, location, network]);

  const displayed = showAll ? suggestions : suggestions.slice(0, 3);

  // Fetch insights on mount and when context changes
  useEffect(() => {
    const fetchInsights = async () => {
      if (!user) return;
      setLoadingInsights(true);
      try {
        const response = await fetch('/api/insights?type=overview&days=7');
        if (response.ok) {
          const data = await response.json();
          setInsights(data.insights);
        }
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setLoadingInsights(false);
      }
    };
    fetchInsights();
  }, [user]);

  const alignmentColor = (a: string) => {
    if (a === 'optimal') return 'text-green-600 bg-green-50';
    if (a === 'good') return 'text-blue-600 bg-blue-50';
    if (a === 'fair') return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">AI Suggestions</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Real-time context info */}
        {insights && insights.burnoutRisk && insights.burnoutRisk.riskLevel !== 'low' && (
          <div className={`p-3 rounded-xl text-xs ${
            insights.burnoutRisk.riskLevel === 'critical' ? 'bg-red-50 border border-red-200' :
            insights.burnoutRisk.riskLevel === 'high' ? 'bg-orange-50 border border-orange-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold text-red-700">Burnout Risk: {insights.burnoutRisk.riskLevel}</span>
            </div>
            <ul className="list-disc list-inside text-red-600 space-y-0.5">
              {insights.burnoutRisk.factors.slice(0, 2).map((factor: string, i: number) => (
                <li key={i}>{factor}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Context inputs */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-600">Current Energy</label>
              <span className="text-xs font-semibold text-indigo-600">{userEnergy}/10 – {ENERGY_LABELS[userEnergy]}</span>
            </div>
            <input
              type="range"
              min={1} max={10} value={userEnergy}
              onChange={(e) => setUserEnergy(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Exhausted</span><span>Peak</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as TaskContext['location'])}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
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
                value={network}
                onChange={(e) => setNetwork(e.target.value as TaskContext['networkStatus'])}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="online">🌐 Online</option>
                <option value="offline">📴 Offline</option>
                <option value="limited">📶 Limited</option>
              </select>
            </div>
          </div>
        </div>

        {/* Productivity insights */}
        {insights && insights.summary && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-green-700">{insights.summary.completedTasks}</p>
              <p className="text-[10px] text-green-600">Completed</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-blue-700">{Math.round(insights.summary.averageEfficiency * 100)}%</p>
              <p className="text-[10px] text-blue-600">Efficiency</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-purple-700">{insights.summary.totalTasks}</p>
              <p className="text-[10px] text-purple-600">Total</p>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">
            Add some goals to get AI suggestions
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Recommended for now</p>
            {displayed.map((s, i) => {
              const goal = goals.find((g) => g.id === s.taskId);
              if (!goal) return null;
              return (
                <div key={s.taskId} className="border border-gray-100 rounded-xl p-3 hover:border-indigo-200 transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-gray-400 mt-0.5 w-4 flex-shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{goal.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.rationale}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${alignmentColor(s.energyAlignment)}`}>
                          {s.energyAlignment} energy fit
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {Math.round(s.confidence * 100)}% match
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {suggestions.length > 3 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full text-xs text-indigo-600 hover:text-indigo-700 py-1.5 text-center"
              >
                {showAll ? 'Show less' : `Show ${suggestions.length - 3} more suggestions`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

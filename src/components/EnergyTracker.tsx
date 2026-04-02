'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDb } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';

interface EnergyEntry {
  id: string;
  level: number; // 1-10
  timestamp: Date;
  context?: string;
  factors?: string[];
}

export default function EnergyTracker() {
  const { user } = useAuth();
  const [currentEnergy, setCurrentEnergy] = useState(5);
  const [entries, setEntries] = useState<EnergyEntry[]>([]);
  const [context, setContext] = useState('');
  const [factors, setFactors] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);

  const predefinedFactors = [
    'Sleep Quality', 'Exercise', 'Nutrition', 'Stress', 'Weather',
    'Social Interaction', 'Work Load', 'Caffeine', 'Meditation', 'Music'
  ];

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(getDb(), 'energyEntries'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      // Limit to last 7 days
      where('timestamp', '>=', Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const energyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      })) as EnergyEntry[];
      setEntries(energyData);
    });

    return unsubscribe;
  }, [user?.uid]);

  const logEnergy = async () => {
    if (!user?.uid) return;

    try {
      await addDoc(collection(getDb(), 'energyEntries'), {
        userId: user.uid,
        level: currentEnergy,
        timestamp: Timestamp.now(),
        context: context || null,
        factors: factors.length > 0 ? factors : null
      });

      setContext('');
      setFactors([]);
      setShowForm(false);
    } catch (error) {
      console.error('Error logging energy:', error);
    }
  };

  const toggleFactor = (factor: string) => {
    setFactors(prev =>
      prev.includes(factor)
        ? prev.filter(f => f !== factor)
        : [...prev, factor]
    );
  };

  const getEnergyColor = (level: number) => {
    if (level <= 3) return 'text-red-500 bg-red-50';
    if (level <= 5) return 'text-yellow-500 bg-yellow-50';
    if (level <= 7) return 'text-blue-500 bg-blue-50';
    return 'text-green-500 bg-green-50';
  };

  const getEnergyLabel = (level: number) => {
    if (level <= 3) return 'Low';
    if (level <= 5) return 'Moderate';
    if (level <= 7) return 'Good';
    return 'High';
  };

  const averageEnergy = entries.length > 0
    ? Math.round(entries.reduce((sum, entry) => sum + entry.level, 0) / entries.length)
    : 0;

  const energyTrend = entries.length >= 2
    ? entries[0].level - entries[1].level
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Energy Tracker</h3>
          <p className="text-sm text-gray-500">Track your energy levels for optimal productivity</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          Log Energy
        </button>
      </div>

      {/* Energy Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${getEnergyColor(averageEnergy)} mb-2`}>
            <span className="text-lg font-bold">{averageEnergy}</span>
          </div>
          <p className="text-xs text-gray-500">7-Day Average</p>
        </div>
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${getEnergyColor(entries[0]?.level || 5)} mb-2`}>
            <span className="text-lg font-bold">{entries[0]?.level || '-'}</span>
          </div>
          <p className="text-xs text-gray-500">Current</p>
        </div>
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${energyTrend > 0 ? 'text-green-500 bg-green-50' : energyTrend < 0 ? 'text-red-500 bg-red-50' : 'text-gray-500 bg-gray-50'} mb-2`}>
            <span className="text-lg font-bold">
              {energyTrend > 0 ? '↗' : energyTrend < 0 ? '↘' : '→'}
            </span>
          </div>
          <p className="text-xs text-gray-500">Trend</p>
        </div>
      </div>

      {/* Energy Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Energy Pattern (Last 7 Days)</h4>
        <div className="h-32 flex items-end justify-between space-x-1">
          {entries.slice(0, 7).reverse().map((entry, index) => (
            <div key={entry.id} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full max-w-8 rounded-t ${getEnergyColor(entry.level)} transition-all duration-300`}
                style={{ height: `${(entry.level / 10) * 100}%` }}
              />
              <span className="text-xs text-gray-400 mt-1">
                {entry.timestamp.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Energy Logging Form */}
      {showForm && (
        <div className="border-t border-gray-200 pt-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Energy Level (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={currentEnergy}
                onChange={(e) => setCurrentEnergy(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 (Exhausted)</span>
                <span className="font-medium">{currentEnergy} - {getEnergyLabel(currentEnergy)}</span>
                <span>10 (Energized)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Context (Optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="How are you feeling? Any specific circumstances?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contributing Factors
              </label>
              <div className="flex flex-wrap gap-2">
                {predefinedFactors.map((factor) => (
                  <button
                    key={factor}
                    onClick={() => toggleFactor(factor)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      factors.includes(factor)
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {factor}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={logEnergy}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                Save Energy Log
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Entries */}
      {entries.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Entries</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEnergyColor(entry.level)}`}>
                    <span className="text-sm font-bold">{entry.level}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.timestamp.toLocaleDateString()} at {entry.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    {entry.context && (
                      <p className="text-xs text-gray-500">{entry.context}</p>
                    )}
                  </div>
                </div>
                {entry.factors && entry.factors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.factors.slice(0, 2).map((factor) => (
                      <span key={factor} className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded">
                        {factor}
                      </span>
                    ))}
                    {entry.factors.length > 2 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        +{entry.factors.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
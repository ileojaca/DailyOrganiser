'use client';

import { useState, useEffect, useRef } from 'react';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { useGoals } from '@/hooks/useGoals';

const PRESETS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
  { label: '90 min', seconds: 90 * 60 },
];

export default function FocusPage() {
  const { user } = useAuth();
  const { goals, completeGoal } = useGoals(user?.uid);
  const [duration, setDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeGoals = goals.filter((g) => g.status === 'pending' || g.status === 'in_progress');

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setDone(true);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const setPreset = (seconds: number) => {
    setDuration(seconds);
    setRemaining(seconds);
    setRunning(false);
    setDone(false);
  };

  const reset = () => {
    setRemaining(duration);
    setRunning(false);
    setDone(false);
  };

  const handleComplete = async () => {
    if (selectedGoalId) {
      await completeGoal(selectedGoalId);
    }
    reset();
  };

  const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
  const secs = (remaining % 60).toString().padStart(2, '0');
  const progress = ((duration - remaining) / duration) * 100;
  const circumference = 2 * Math.PI * 90;

  return (
    <AppShell>
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Focus Timer</h1>
          <p className="text-gray-500 text-sm mt-1">Stay in the zone with timed focus sessions</p>
        </div>

        {/* Help banner */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-sm text-blue-800"><strong>⏱️ Tip:</strong> Select a task below, choose your focus duration, and hit Start. Mark tasks complete when your session ends.</p>
        </div>

        {/* Goal selector */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Working on</label>
          <select
            value={selectedGoalId}
            onChange={(e) => setSelectedGoalId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
          >
            <option value="">— Select a task (optional) —</option>
            {activeGoals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>

        {/* Timer */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center gap-6">
          {/* Circular progress */}
          <div className="relative w-52 h-52">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle
                cx="100" cy="100" r="90"
                fill="none"
                stroke={done ? '#22c55e' : '#4f46e5'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * progress) / 100}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-900 tabular-nums">{mins}:{secs}</span>
              <span className="text-xs text-gray-400 mt-1">{done ? 'Complete!' : running ? 'Focusing...' : 'Ready'}</span>
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPreset(p.seconds)}
                disabled={running}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  duration === p.seconds
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 disabled:opacity-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {done ? (
              <>
                <button
                  onClick={reset}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reset
                </button>
                {selectedGoalId && (
                  <button
                    onClick={handleComplete}
                    className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                  >
                    Mark Task Done
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={reset}
                  disabled={running}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  Reset
                </button>
                <button
                  onClick={() => setRunning((r) => !r)}
                  className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    running
                      ? 'bg-gray-800 text-white hover:bg-gray-900'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {running ? 'Pause' : 'Start'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

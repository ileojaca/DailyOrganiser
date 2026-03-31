'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { SleepRecord, SleepAnalysis } from '@/types/lifeManagement';

export default function SleepTracker() {
  const { user } = useAuth();
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([]);
  const [analysis, setAnalysis] = useState<SleepAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddSleep, setShowAddSleep] = useState(false);
  const [newSleep, setNewSleep] = useState({
    bedtime: '23:00',
    wakeTime: '07:00',
    quality: 7,
    awakenings: 0,
    notes: '',
  });

  useEffect(() => {
    if (!user) return;

    // Load from localStorage
    const saved = localStorage.getItem(`sleep_records_${user.uid}`);
    if (saved) {
      const records = JSON.parse(saved);
      setSleepRecords(records);
      analyzeSleep(records);
    }
    setLoading(false);
  }, [user]);

  const analyzeSleep = (records: SleepRecord[]) => {
    if (records.length === 0) return;

    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const totalQuality = records.reduce((sum, r) => sum + r.quality, 0);
    const avgDuration = totalDuration / records.length;
    const avgQuality = totalQuality / records.length;

    // Calculate sleep debt (assuming 8 hours is optimal)
    const optimalSleep = 8 * 60; // 8 hours in minutes
    const sleepDebt = records.reduce((debt, r) => {
      return debt + Math.max(0, optimalSleep - r.duration);
    }, 0) / 60; // Convert to hours

    // Find optimal bedtime
    const bedtimes = records.map(r => {
      const bedtimeStr = r.bedtime instanceof Date ? r.bedtime.toTimeString().slice(0, 5) : r.bedtime;
      const [hours, minutes] = bedtimeStr.split(':').map(Number);
      return hours * 60 + minutes;
    });
    const avgBedtimeMinutes = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const optimalBedtimeHours = Math.floor(avgBedtimeMinutes / 60);
    const optimalBedtimeMinutes = Math.round(avgBedtimeMinutes % 60);
    const optimalBedtime = `${optimalBedtimeHours.toString().padStart(2, '0')}:${optimalBedtimeMinutes.toString().padStart(2, '0')}`;

    // Find optimal wake time
    const wakeTimes = records.map(r => {
      const wakeTimeStr = r.wakeTime instanceof Date ? r.wakeTime.toTimeString().slice(0, 5) : r.wakeTime;
      const [hours, minutes] = wakeTimeStr.split(':').map(Number);
      return hours * 60 + minutes;
    });
    const avgWakeTimeMinutes = wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length;
    const optimalWakeTimeHours = Math.floor(avgWakeTimeMinutes / 60);
    const optimalWakeTimeMinutes = Math.round(avgWakeTimeMinutes % 60);
    const optimalWakeTime = `${optimalWakeTimeHours.toString().padStart(2, '0')}:${optimalWakeTimeMinutes.toString().padStart(2, '0')}`;

    // Calculate sleep efficiency
    const avgAwakenings = records.reduce((sum, r) => sum + r.awakenings, 0) / records.length;
    const sleepEfficiency = Math.max(0, 100 - (avgAwakenings * 10));

    // Generate recommendations
    const recommendations: string[] = [];
    if (avgDuration < 7 * 60) {
      recommendations.push('Try to get at least 7 hours of sleep per night');
    }
    if (avgQuality < 6) {
      recommendations.push('Consider improving sleep environment (dark, cool, quiet)');
    }
    if (sleepDebt > 5) {
      recommendations.push('You have significant sleep debt. Consider catching up on weekends');
    }

    setAnalysis({
      userId: user?.uid || '',
      averageDuration: Math.round(avgDuration),
      averageQuality: Math.round(avgQuality * 10) / 10,
      sleepDebt: Math.round(sleepDebt * 10) / 10,
      optimalBedtime,
      optimalWakeTime,
      sleepEfficiency: Math.round(sleepEfficiency),
      recommendations,
      analyzedAt: new Date(),
    });
  };

  const addSleepRecord = () => {
    if (!user) return;

    const bedtime = new Date(`2000-01-01T${newSleep.bedtime}`);
    const wakeTime = new Date(`2000-01-01T${newSleep.wakeTime}`);
    if (wakeTime < bedtime) {
      wakeTime.setDate(wakeTime.getDate() + 1);
    }
    const duration = Math.round((wakeTime.getTime() - bedtime.getTime()) / (1000 * 60));

    const record: SleepRecord = {
      id: `sleep_${Date.now()}`,
      userId: user.uid,
      date: new Date(),
      bedtime: new Date(`2000-01-01T${newSleep.bedtime}`),
      wakeTime: new Date(`2000-01-01T${newSleep.wakeTime}`),
      duration,
      quality: newSleep.quality,
      awakenings: newSleep.awakenings,
      notes: newSleep.notes || undefined,
      source: 'manual',
      createdAt: new Date(),
    };

    const updated = [record, ...sleepRecords];
    setSleepRecords(updated);
    localStorage.setItem(`sleep_records_${user.uid}`, JSON.stringify(updated));
    analyzeSleep(updated);
    setShowAddSleep(false);
    setNewSleep({ bedtime: '23:00', wakeTime: '07:00', quality: 7, awakenings: 0, notes: '' });
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 8) return 'text-green-600 dark:text-green-400';
    if (quality >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getQualityBg = (quality: number) => {
    if (quality >= 8) return 'bg-green-100 dark:bg-green-900/20';
    if (quality >= 6) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sleep Tracker</h2>
        <button
          onClick={() => setShowAddSleep(true)}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Log Sleep
        </button>
      </div>

      {/* Sleep Analysis */}
      {analysis && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Analysis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${getQualityBg(analysis.averageQuality / 10)}`}>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Quality</p>
              <p className={`text-2xl font-bold ${getQualityColor(analysis.averageQuality / 10)}`}>
                {analysis.averageQuality}/10
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(analysis.averageDuration / 60)}h {analysis.averageDuration % 60}m
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <p className="text-sm text-gray-600 dark:text-gray-400">Optimal Bedtime</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {analysis.optimalBedtime}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="text-sm text-gray-600 dark:text-gray-400">Sleep Efficiency</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {analysis.sleepEfficiency}%
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recommendations
              </h4>
              <div className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-indigo-500">💡</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Sleep Records */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Sleep</h3>
        {sleepRecords.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No sleep records yet. Log your sleep to track patterns.
          </p>
        ) : (
          <div className="space-y-2">
            {sleepRecords.slice(0, 5).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {record.bedtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {record.wakeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {Math.round(record.duration / 60)}h {record.duration % 60}m
                  </p>
                  <p className={`text-xs ${getQualityColor(record.quality)}`}>
                    Quality: {record.quality}/10
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Sleep Modal */}
      {showAddSleep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Log Sleep
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bedtime
                  </label>
                  <input
                    type="time"
                    value={newSleep.bedtime}
                    onChange={(e) => setNewSleep({ ...newSleep, bedtime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Wake Time
                  </label>
                  <input
                    type="time"
                    value={newSleep.wakeTime}
                    onChange={(e) => setNewSleep({ ...newSleep, wakeTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sleep Quality (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newSleep.quality}
                  onChange={(e) => setNewSleep({ ...newSleep, quality: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Awakenings
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={newSleep.awakenings}
                  onChange={(e) => setNewSleep({ ...newSleep, awakenings: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={newSleep.notes}
                  onChange={(e) => setNewSleep({ ...newSleep, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="Any notes about your sleep..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddSleep(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={addSleepRecord}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Log Sleep
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

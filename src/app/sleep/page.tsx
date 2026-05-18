'use client';
import AppShell from '@/components/AppShell';
import SleepTracker from '@/components/SleepTracker';

export default function SleepPage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sleep Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your rest patterns to optimise your energy and focus.</p>
        </div>
        <SleepTracker />
      </div>
    </AppShell>
  );
}

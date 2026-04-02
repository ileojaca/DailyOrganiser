'use client';

import AppShell from '@/components/AppShell';
import WorkLifeBalance from '@/components/WorkLifeBalance';

export default function WorkLifeBalancePage() {
  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Work-Life Balance</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track and optimize your time allocation across different life areas
          </p>
        </div>
        <WorkLifeBalance />
      </div>
    </AppShell>
  );
}
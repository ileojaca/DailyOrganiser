'use client';
import AppShell from '@/components/AppShell';
import FamilyHub from '@/components/FamilyHub';

export default function FamilyPage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Family Hub</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Stay connected with the people that matter most.</p>
        </div>
        <FamilyHub />
      </div>
    </AppShell>
  );
}

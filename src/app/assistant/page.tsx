'use client';
import AppShell from '@/components/AppShell';
import AIAdvisory from '@/components/AIAdvisory';
import AISuggestions from '@/components/AISuggestions';

export default function AssistantPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Assistant</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Personalised advice, weekly reviews, and burnout risk analysis — all driven by your real data.</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AIAdvisory />
          <AISuggestions />
        </div>
      </div>
    </AppShell>
  );
}

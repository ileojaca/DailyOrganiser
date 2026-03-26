'use client';

import AppShell from '@/components/AppShell';
import GoalInput from '@/components/GoalInput';
import TaskDashboard from '@/components/TaskDashboard';
import AISuggestions from '@/components/AISuggestions';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { profile } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = profile?.fullName?.split(' ')[0] || 'there';

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{greeting}, {name} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Goal input + AI suggestions */}
          <div className="xl:col-span-1 space-y-6">
            <GoalInput />
            <AISuggestions />
          </div>

          {/* Right: Task dashboard */}
          <div className="xl:col-span-2">
            <TaskDashboard />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import OnboardingFlow from '@/components/OnboardingFlow';

export default function OnboardPage() {
  const router = useRouter();
  const [completed, setCompleted] = useState(false);

  const handleComplete = () => {
    setCompleted(true);
    router.push('/');
  };

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center p-6">
        {completed ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Onboarding complete!</h1>
            <p className="text-gray-600 mt-2">Redirecting to your dashboard…</p>
          </div>
        ) : (
          <OnboardingFlow onComplete={handleComplete} />
        )}
      </div>
    </AppShell>
  );
}
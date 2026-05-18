'use client';

import { useState, useEffect, useCallback } from 'react';
import AppShell from '@/components/AppShell';
import AIAdvisory from '@/components/AIAdvisory';
import AISuggestions from '@/components/AISuggestions';
import DailyBriefingCard from '@/components/DailyBriefingCard';
import { useAuth } from '@/contexts/AuthContext';

export default function AssistantPage() {
  const { user } = useAuth();
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingError, setBriefingError] = useState(false);

  const fetchBriefing = useCallback(
    async (refresh = false) => {
      setBriefingLoading(true);
      setBriefingError(false);
      try {
        const token = await user?.getIdToken();
        const url = refresh ? '/api/briefing?refresh=true' : '/api/briefing';
        const res = await fetch(url, {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) throw new Error('Failed to fetch briefing');
        const data = await res.json();
        setBriefing(data.briefing ?? null);
      } catch {
        setBriefingError(true);
        setBriefing(null);
      } finally {
        setBriefingLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (user) {
      fetchBriefing(false);
    }
  }, [user, fetchBriefing]);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Assistant</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Personalised advice, daily briefings, and burnout risk analysis — all driven by your real data.
          </p>
        </div>

        <DailyBriefingCard
          briefing={briefing}
          loading={briefingLoading}
          error={briefingError}
          onRefresh={() => fetchBriefing(true)}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AIAdvisory />
          <AISuggestions />
        </div>
      </div>
    </AppShell>
  );
}

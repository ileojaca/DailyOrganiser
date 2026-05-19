'use client';
export const dynamic = 'force-dynamic';

import AppShell from '@/components/AppShell';
import EnergyTracker from '@/components/EnergyTracker';

export default function EnergyPage() {
  return (
    <AppShell>
      <div className="p-6 max-w-2xl mx-auto">
        <EnergyTracker />
      </div>
    </AppShell>
  );
}

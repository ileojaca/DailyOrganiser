'use client';
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import OnboardingFlow from '@/components/OnboardingFlow';

export default function OnboardPage() {
  const router = useRouter();
  return <OnboardingFlow onComplete={() => router.push('/')} />;
}
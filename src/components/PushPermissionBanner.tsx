'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function PushPermissionBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      user &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default' &&
      !localStorage.getItem('push_banner_dismissed')
    ) {
      setVisible(true);
    }
  }, [user]);

  if (!visible) return null;

  const handleEnable = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const existing = await reg.pushManager.getSubscription();
        const subscription = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });
        const token = await user!.getIdToken();
        await fetch('/api/notifications/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'subscribe', subscription }),
        });
      } catch (err) {
        console.error('[PushBanner] Failed to subscribe:', err);
      }
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('push_banner_dismissed', 'true');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <p className="flex-1 text-sm text-gray-700 dark:text-gray-200">
          Stay on top of your day — enable push notifications for reminders and alerts
        </p>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={handleEnable}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Enable
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs font-medium transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

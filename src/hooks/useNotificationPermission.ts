'use client';

import { useState, useEffect, useCallback } from 'react';

type NotificationPermission = 'default' | 'granted' | 'denied';

interface UseNotificationPermissionReturn {
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  scheduleLocalNotification: (
    title: string,
    body: string,
    url?: string,
    delayMs?: number
  ) => void;
}

export function useNotificationPermission(): UseNotificationPermissionReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setPermission(Notification.permission as NotificationPermission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermission);

    if (result === 'granted' && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (err) {
        console.error('Service worker registration failed:', err);
      }
    }
  }, []);

  const scheduleLocalNotification = useCallback(
    (title: string, body: string, url?: string, delayMs = 0) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      setTimeout(() => {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          data: { url: url || '/' },
        });
      }, delayMs);
    },
    []
  );

  return { permission, requestPermission, scheduleLocalNotification };
}

import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { getFirebaseApp } from '@/lib/firebase';

// VAPID key for web push (you'll need to generate this in Firebase Console)
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Initialize Firebase Cloud Messaging and get token
 */
export async function initializeFCM(): Promise<string | null> {
  try {
    if (!isPushSupported() || !VAPID_KEY) {
      console.warn('Push notifications not supported or VAPID key not configured');
      return null;
    }

    const messaging = getMessaging(getFirebaseApp());
    
    // Register service worker
    const registration = await navigator.serviceWorker.ready;
    
    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token;
  } catch (error) {
    console.error('Error initializing FCM:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): () => void {
  if (!isPushSupported()) {
    return () => {};
  }

  try {
    const messaging = getMessaging(getFirebaseApp());
    const unsubscribe = onMessage(messaging, callback);
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up foreground message listener:', error);
    return () => {};
  }
}

/**
 * Show a local notification
 */
export async function showLocalNotification(
  payload: NotificationPayload
): Promise<void> {
  if (!isPushSupported()) {
    console.warn('Notifications not supported');
    return;
  }

  const permission = getNotificationPermission();
  if (permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  
  await registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/badge-72x72.png',
    data: payload.data,
    tag: payload.data?.tag as string || 'dailyorganiser',
    renotify: true,
  } as NotificationOptions & { actions?: Array<{ action: string; title: string; icon?: string }> });
}

/**
 * Schedule a notification for a specific time
 */
export function scheduleNotification(
  payload: NotificationPayload,
  scheduledTime: Date
): number {
  const now = new Date();
  const delay = scheduledTime.getTime() - now.getTime();

  if (delay <= 0) {
    // Show immediately if time has passed
    showLocalNotification(payload);
    return 0;
  }

  const timeoutId = window.setTimeout(() => {
    showLocalNotification(payload);
  }, delay);

  return timeoutId;
}

/**
 * Cancel a scheduled notification
 */
export function cancelScheduledNotification(timeoutId: number): void {
  window.clearTimeout(timeoutId);
}

/**
 * Create task reminder notification
 */
export function createTaskReminderNotification(
  taskTitle: string,
  scheduledTime: Date,
  taskId: string
): NotificationPayload {
  const timeString = scheduledTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    title: 'Task Reminder',
    body: `"${taskTitle}" is scheduled for ${timeString}`,
    icon: '/icon-192x192.png',
    data: {
      type: 'task_reminder',
      taskId,
      scheduledTime: scheduledTime.toISOString(),
    },
    actions: [
      { action: 'start', title: 'Start Task' },
      { action: 'snooze', title: 'Snooze 15min' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
}

/**
 * Create break reminder notification
 */
export function createBreakReminderNotification(
  breakType: 'short' | 'medium' | 'long',
  duration: number
): NotificationPayload {
  const messages = {
    short: {
      title: 'Quick Break Time!',
      body: `Take a ${duration}-minute break to refresh.`,
    },
    medium: {
      title: 'Time for a Break',
      body: `You've been working hard. Take a ${duration}-minute break.`,
    },
    long: {
      title: 'Extended Break Recommended',
      body: `Consider a ${duration}-minute break to recharge fully.`,
    },
  };

  return {
    title: messages[breakType].title,
    body: messages[breakType].body,
    icon: '/icon-192x192.png',
    data: {
      type: 'break_reminder',
      breakType,
      duration,
    },
    actions: [
      { action: 'start_break', title: 'Start Break' },
      { action: 'postpone', title: 'Postpone 10min' },
    ],
  };
}

/**
 * Create deadline warning notification
 */
export function createDeadlineWarningNotification(
  taskTitle: string,
  deadline: Date,
  taskId: string
): NotificationPayload {
  const now = new Date();
  const hoursUntilDeadline = Math.round(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
  );

  let urgency = 'soon';
  if (hoursUntilDeadline <= 1) urgency = 'urgent';
  else if (hoursUntilDeadline <= 3) urgency = 'very soon';

  return {
    title: `Deadline ${urgency}!`,
    body: `"${taskTitle}" is due in ${hoursUntilDeadline} hour${hoursUntilDeadline !== 1 ? 's' : ''}.`,
    icon: '/icon-192x192.png',
    data: {
      type: 'deadline_warning',
      taskId,
      deadline: deadline.toISOString(),
      hoursUntilDeadline,
    },
    actions: [
      { action: 'view_task', title: 'View Task' },
      { action: 'start_now', title: 'Start Now' },
    ],
  };
}

/**
 * Create productivity insight notification
 */
export function createProductivityInsightNotification(
  insight: string,
  metric?: { label: string; value: string | number }
): NotificationPayload {
  return {
    title: 'Productivity Insight',
    body: metric ? `${insight} (${metric.label}: ${metric.value})` : insight,
    icon: '/icon-192x192.png',
    data: {
      type: 'productivity_insight',
      insight,
      metric,
    },
  };
}

/**
 * Save push subscription to server
 */
export async function savePushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        subscription,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return false;
  }
}

/**
 * Remove push subscription from server
 */
export async function removePushSubscription(
  userId: string,
  endpoint: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        endpoint,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return false;
  }
}

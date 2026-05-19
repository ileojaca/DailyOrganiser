export function scheduleTaskReminder(title: string, startTime: Date): void {
  if (typeof window === 'undefined') return;
  if (Notification.permission !== 'granted') return;

  const now = Date.now();
  const reminderTime = startTime.getTime() - 2 * 60 * 1000; // 2 minutes before
  const delay = reminderTime - now;

  if (delay < 0) return;

  setTimeout(() => {
    try {
      new Notification(`Upcoming: ${title}`, {
        body: `Starts in 2 minutes`,
        icon: '/icon-192.png',
      });
    } catch {
      // Notification may fail in some contexts
    }
  }, delay);
}

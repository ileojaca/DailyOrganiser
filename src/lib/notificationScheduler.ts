export function scheduleTaskReminder(title: string, startTime: Date) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;
  const msUntilStart = startTime.getTime() - Date.now() - 2 * 60 * 1000; // 2min before
  if (msUntilStart > 0) {
    setTimeout(() => {
      new Notification('Starting soon', { body: `"${title}" starts in 2 minutes` });
    }, msUntilStart);
  }
}

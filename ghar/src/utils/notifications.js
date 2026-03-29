export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    ...options
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  return notification;
}

export function notifyChoreReminder(pendingCount) {
  if (pendingCount === 0) return;
  sendNotification('Ghar Reminder', {
    body: pendingCount === 1
      ? 'You have 1 chore left today. You got this!'
      : `You have ${pendingCount} chores left today. Small steps!`,
    tag: 'chore-reminder'
  });
}

export function notifyStreakUpdate(streakCount) {
  sendNotification('Streak Update!', {
    body: `${streakCount} day streak! Your home garden is growing.`,
    tag: 'streak-update'
  });
}

export function notifyMealReminder() {
  sendNotification('Meal Planning', {
    body: "What's for dinner tonight? Open Ghar to check your plan.",
    tag: 'meal-reminder'
  });
}

export function scheduleChoreReminder(pendingCount) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (pendingCount === 0) return;

  const now = new Date();
  const evening = new Date();
  evening.setHours(19, 0, 0, 0);

  if (now < evening) {
    const delay = evening.getTime() - now.getTime();
    setTimeout(() => notifyChoreReminder(pendingCount), delay);
  }
}

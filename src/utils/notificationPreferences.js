export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  pomodoroEnabled: false,
  dailyReminderEnabled: false,
  reminderHour: 19,
  reminderMinute: 0,
  pomodoroNotificationId: null,
  pomodoroSessionId: null,
  pomodoroScheduledEndsAt: null,
  dailyReminderNotificationId: null,
  dailyReminderSignature: null,
});

function boundedInteger(value, min, max, fallback) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function sanitizeNotificationPreferences(value = {}) {
  return {
    pomodoroEnabled: value.pomodoroEnabled === true,
    dailyReminderEnabled: value.dailyReminderEnabled === true,
    reminderHour: boundedInteger(value.reminderHour, 0, 23, DEFAULT_NOTIFICATION_PREFERENCES.reminderHour),
    reminderMinute: boundedInteger(value.reminderMinute, 0, 59, DEFAULT_NOTIFICATION_PREFERENCES.reminderMinute),
    pomodoroNotificationId: typeof value.pomodoroNotificationId === 'string' ? value.pomodoroNotificationId : null,
    pomodoroSessionId: typeof value.pomodoroSessionId === 'string' ? value.pomodoroSessionId : null,
    pomodoroScheduledEndsAt: Number.isFinite(Number(value.pomodoroScheduledEndsAt)) ? Number(value.pomodoroScheduledEndsAt) : null,
    dailyReminderNotificationId: typeof value.dailyReminderNotificationId === 'string' ? value.dailyReminderNotificationId : null,
    dailyReminderSignature: typeof value.dailyReminderSignature === 'string' ? value.dailyReminderSignature : null,
  };
}

export function reminderSignature(hour, minute) {
  return `${hour}:${minute}`;
}

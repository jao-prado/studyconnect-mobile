import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export const POMODORO_CHANNEL_ID = 'studymode-pomodoro';
export const REMINDER_CHANNEL_ID = 'studymode-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function prepareNotificationChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(POMODORO_CHANNEL_ID, {
      name: 'Conclusão do Pomodoro',
      description: 'Avisos quando uma fase de foco ou descanso termina.',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 180, 250],
    }),
    Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Lembretes de estudo',
      description: 'Lembretes diários configurados no StudyMode.',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    }),
  ]);
}

export async function getNotificationPermissionState() {
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) return 'granted';
  return permission.canAskAgain === false ? 'blocked' : permission.status;
}

export async function requestNotificationPermission() {
  await prepareNotificationChannels();
  const existing = await getNotificationPermissionState();
  if (existing === 'granted' || existing === 'blocked') return existing;
  const result = await Notifications.requestPermissionsAsync();
  if (result.granted) return 'granted';
  return result.canAskAgain === false ? 'blocked' : result.status;
}

export async function schedulePomodoroNotification({ userId, sessionId, phase, endsAt }) {
  await prepareNotificationChannels();
  const isFocus = phase === 'focus';
  return Notifications.scheduleNotificationAsync({
    content: {
      title: isFocus ? 'Foco concluído!' : 'Descanso concluído!',
      body: isFocus
        ? 'Boa! Sua sessão de estudo terminou. Que tal descansar um pouco?'
        : 'Hora de voltar aos estudos!',
      sound: 'default',
      data: { type: 'studymode-pomodoro', userId: String(userId), sessionId: String(sessionId) },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(endsAt),
      channelId: POMODORO_CHANNEL_ID,
    },
  });
}

export async function scheduleDailyReminder({ userId, hour, minute }) {
  await prepareNotificationChannels();
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hora de estudar!',
      body: 'Reserve alguns minutos para avançar nas suas metas do StudyMode.',
      sound: 'default',
      data: { type: 'studymode-daily-reminder', userId: String(userId) },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}

export async function cancelNotification(identifier) {
  if (!identifier || typeof identifier !== 'string') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // IDs expirados ou removidos pelo sistema não devem interromper o Pomodoro.
  }
}

export async function getScheduledNotificationIds() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return new Set(scheduled.map((request) => request.identifier));
}

export async function openNotificationSettings() {
  await Linking.openSettings();
}

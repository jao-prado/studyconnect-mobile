import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from './AuthContext';
import { readStudyModeData, saveStudyModeData } from '../services/studyModeStorage';
import {
  cancelNotification,
  getNotificationPermissionState,
  getScheduledNotificationIds,
  requestNotificationPermission,
  scheduleDailyReminder,
  schedulePomodoroNotification,
} from '../services/notificationService';
import { useCurrentLocalDate } from '../hooks/useCurrentLocalDate';
import {
  DEFAULT_STUDY_SETTINGS,
  durationForPhase,
  elapsedWhileRunning,
  localDateKey,
  nextPhaseAfter,
  remainingFromEndTime,
  sanitizeSettings,
} from '../utils/studyModeUtils';
import { aggregateStudyDays, DEFAULT_DAILY_GOAL_MINUTES, sanitizeDailyGoal } from '../utils/studyAnalytics';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  reminderSignature,
  sanitizeNotificationPreferences,
} from '../utils/notificationPreferences';

const StudyModeContext = createContext(null);

function createIdleSession(phase, settings) {
  const durationSeconds = durationForPhase(phase, settings);
  return {
    id: null,
    phase,
    status: 'idle',
    durationSeconds,
    remainingSeconds: durationSeconds,
    elapsedSeconds: 0,
    runStartedAt: null,
    endsAt: null,
  };
}

function validHistory(history) {
  return Array.isArray(history) ? history.filter((item) => item?.id && item?.completedAt) : [];
}

export function StudyModeProvider({ children }) {
  const { user } = useAuth();
  const currentLocalDate = useCurrentLocalDate();
  const userId = user?.id;
  const [settings, setSettings] = useState(DEFAULT_STUDY_SETTINGS);
  const [session, setSession] = useState(() => createIdleSession('focus', DEFAULT_STUDY_SETTINGS));
  const [history, setHistory] = useState([]);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(DEFAULT_DAILY_GOAL_MINUTES);
  const [notificationPreferences, setNotificationPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [notificationPermission, setNotificationPermission] = useState('unknown');
  const [notificationError, setNotificationError] = useState(null);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const activeUserRef = useRef(userId);
  const saveQueueRef = useRef(Promise.resolve());
  const pomodoroNotificationQueueRef = useRef(Promise.resolve());
  const reminderNotificationQueueRef = useRef(Promise.resolve());
  const sessionRef = useRef(session);
  const notificationPreferencesRef = useRef(notificationPreferences);
  const isReady = loadedUserId === userId;

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    notificationPreferencesRef.current = notificationPreferences;
  }, [notificationPreferences]);

  useEffect(() => {
    let active = true;
    activeUserRef.current = userId;

    async function restore() {
      const [stored, permission] = await Promise.all([
        readStudyModeData(userId),
        getNotificationPermissionState().catch(() => 'unknown'),
      ]);
      if (!active) return;

      const restoredSettings = sanitizeSettings(stored?.settings || DEFAULT_STUDY_SETTINGS);
      const restoredHistory = validHistory(stored?.history);
      const restoredDailyGoal = sanitizeDailyGoal(stored?.dailyGoalMinutes);
      const restoredNotificationPreferences = sanitizeNotificationPreferences(stored?.notificationPreferences);
      let restoredSession = stored?.session;
      if (!restoredSession?.phase || !restoredSession?.status) {
        restoredSession = createIdleSession('focus', restoredSettings);
      }

      if (restoredSession.status === 'running') {
        const remainingSeconds = remainingFromEndTime(restoredSession.endsAt);
        if (remainingSeconds > 0) {
          restoredSession = { ...restoredSession, remainingSeconds };
        } else {
          const alreadyRecorded = restoredHistory.some((item) => item.id === restoredSession.id);
          if (restoredSession.phase === 'focus' && !alreadyRecorded) {
            const completedAt = new Date(restoredSession.endsAt || Date.now());
            restoredHistory.push({
              id: restoredSession.id,
              durationSeconds: restoredSession.durationSeconds,
              completedAt: completedAt.toISOString(),
              localDate: localDateKey(completedAt),
            });
          }
          restoredSession = {
            ...restoredSession,
            status: 'completed',
            remainingSeconds: 0,
            elapsedSeconds: restoredSession.durationSeconds,
            runStartedAt: null,
            endsAt: null,
          };
        }
      }

      setSettings(restoredSettings);
      setHistory(restoredHistory);
      setDailyGoalMinutes(restoredDailyGoal);
      setNotificationPreferences(restoredNotificationPreferences);
      setNotificationPermission(permission);
      setSession(restoredSession);
      setLoadedUserId(userId);
    }

    if (userId !== undefined && userId !== null) {
      void restore().catch(() => {
        if (!active) return;
        setSettings(DEFAULT_STUDY_SETTINGS);
        setHistory([]);
        setDailyGoalMinutes(DEFAULT_DAILY_GOAL_MINUTES);
        setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        setNotificationPermission('unknown');
        setNotificationError(null);
        setSession(createIdleSession('focus', DEFAULT_STUDY_SETTINGS));
        setLoadedUserId(userId);
      });
    }

    return () => {
      active = false;
      if (activeUserRef.current === userId) activeUserRef.current = null;
    };
  }, [userId]);

  useEffect(() => {
    if (!isReady || userId === undefined || userId === null || activeUserRef.current !== userId) return;
    saveQueueRef.current = saveQueueRef.current
      .catch(() => {})
      .then(() => {
        if (activeUserRef.current !== userId) return;
        return saveStudyModeData(userId, { settings, session, history, dailyGoalMinutes, notificationPreferences });
      })
      .catch(() => {
        if (activeUserRef.current === userId) setNotificationError('Não foi possível agendar o aviso desta sessão. O temporizador continua funcionando.');
      });
  }, [dailyGoalMinutes, history, isReady, notificationPreferences, session, settings, userId]);

  useEffect(() => () => {
    const preferences = notificationPreferencesRef.current;
    void cancelNotification(preferences.pomodoroNotificationId);
    void cancelNotification(preferences.dailyReminderNotificationId);
  }, [userId]);

  useEffect(() => {
    if (!isReady) return;
    const desiredSessionId = session.status === 'running' ? session.id : null;
    const desiredEndsAt = session.status === 'running' ? session.endsAt : null;
    const shouldSchedule = notificationPreferences.pomodoroEnabled
      && notificationPermission === 'granted'
      && desiredSessionId
      && desiredEndsAt > Date.now();

    pomodoroNotificationQueueRef.current = pomodoroNotificationQueueRef.current
      .catch(() => {})
      .then(async () => {
        const current = notificationPreferencesRef.current;
        const metadataMatches = shouldSchedule
          && current.pomodoroSessionId === desiredSessionId
          && current.pomodoroScheduledEndsAt === desiredEndsAt;
        if (metadataMatches && current.pomodoroNotificationId) {
          const scheduledIds = await getScheduledNotificationIds().catch(() => new Set());
          if (scheduledIds.has(current.pomodoroNotificationId)) return;
        }

        await cancelNotification(current.pomodoroNotificationId);
        if (!shouldSchedule) {
          setNotificationPreferences((value) => ({
            ...value,
            pomodoroNotificationId: null,
            pomodoroSessionId: null,
            pomodoroScheduledEndsAt: null,
          }));
          return;
        }

        const identifier = await schedulePomodoroNotification({
          userId,
          sessionId: desiredSessionId,
          phase: session.phase,
          endsAt: desiredEndsAt,
        });
        const latestSession = sessionRef.current;
        if (activeUserRef.current !== userId || latestSession.status !== 'running' || latestSession.id !== desiredSessionId || latestSession.endsAt !== desiredEndsAt) {
          await cancelNotification(identifier);
          return;
        }
        setNotificationPreferences((value) => ({
          ...value,
          pomodoroNotificationId: identifier,
          pomodoroSessionId: desiredSessionId,
          pomodoroScheduledEndsAt: desiredEndsAt,
        }));
      })
      .catch(() => {
        if (activeUserRef.current === userId) setNotificationError('Não foi possível agendar o lembrete diário. Tente novamente mais tarde.');
      });
  }, [isReady, notificationPermission, notificationPreferences.pomodoroEnabled, session.endsAt, session.id, session.phase, session.status, userId]);

  useEffect(() => {
    if (!isReady) return;
    const signature = reminderSignature(notificationPreferences.reminderHour, notificationPreferences.reminderMinute);
    const shouldSchedule = notificationPreferences.dailyReminderEnabled && notificationPermission === 'granted';

    reminderNotificationQueueRef.current = reminderNotificationQueueRef.current
      .catch(() => {})
      .then(async () => {
        const current = notificationPreferencesRef.current;
        const metadataMatches = shouldSchedule && current.dailyReminderSignature === signature;
        if (metadataMatches && current.dailyReminderNotificationId) {
          const scheduledIds = await getScheduledNotificationIds().catch(() => new Set());
          if (scheduledIds.has(current.dailyReminderNotificationId)) return;
        }

        await cancelNotification(current.dailyReminderNotificationId);
        if (!shouldSchedule) {
          setNotificationPreferences((value) => ({ ...value, dailyReminderNotificationId: null, dailyReminderSignature: null }));
          return;
        }

        const identifier = await scheduleDailyReminder({
          userId,
          hour: notificationPreferences.reminderHour,
          minute: notificationPreferences.reminderMinute,
        });
        if (activeUserRef.current !== userId || !notificationPreferencesRef.current.dailyReminderEnabled) {
          await cancelNotification(identifier);
          return;
        }
        setNotificationPreferences((value) => ({
          ...value,
          dailyReminderNotificationId: identifier,
          dailyReminderSignature: signature,
        }));
      })
      .catch(() => {});
  }, [isReady, notificationPermission, notificationPreferences.dailyReminderEnabled, notificationPreferences.reminderHour, notificationPreferences.reminderMinute, userId]);

  const completeSession = useCallback((completedSession) => {
    if (completedSession.phase === 'focus') {
      setHistory((current) => {
        if (current.some((item) => item.id === completedSession.id)) return current;
        const completedAt = new Date();
        return [...current, {
          id: completedSession.id,
          durationSeconds: completedSession.durationSeconds,
          completedAt: completedAt.toISOString(),
          localDate: localDateKey(completedAt),
        }];
      });
    }
    setSession({
      ...completedSession,
      status: 'completed',
      remainingSeconds: 0,
      elapsedSeconds: completedSession.durationSeconds,
      runStartedAt: null,
      endsAt: null,
    });
  }, []);

  useEffect(() => {
    if (!isReady || session.status !== 'running') return undefined;
    const tick = () => {
      const remainingSeconds = remainingFromEndTime(session.endsAt);
      if (remainingSeconds <= 0) completeSession(session);
      else setSession((current) => current.id === session.id ? { ...current, remainingSeconds } : current);
    };
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [completeSession, isReady, session]);

  const start = useCallback(() => {
    const now = Date.now();
    setSession((current) => {
      if (current.status !== 'idle') return current;
      const durationSeconds = durationForPhase(current.phase, settings);
      return {
        ...current,
        id: `${userId}-${now}-${Math.random().toString(36).slice(2, 8)}`,
        status: 'running',
        durationSeconds,
        remainingSeconds: durationSeconds,
        elapsedSeconds: 0,
        runStartedAt: now,
        endsAt: now + durationSeconds * 1000,
      };
    });
  }, [settings, userId]);

  const pause = useCallback(() => {
    const now = Date.now();
    setSession((current) => {
      if (current.status !== 'running') return current;
      const remainingSeconds = remainingFromEndTime(current.endsAt, now);
      return {
        ...current,
        status: 'paused',
        remainingSeconds,
        elapsedSeconds: elapsedWhileRunning(current, now),
        runStartedAt: null,
        endsAt: null,
      };
    });
  }, []);

  const resume = useCallback(() => {
    const now = Date.now();
    setSession((current) => current.status === 'paused' ? {
      ...current,
      status: 'running',
      runStartedAt: now,
      endsAt: now + current.remainingSeconds * 1000,
    } : current);
  }, []);

  const cancel = useCallback(() => {
    setSession((current) => createIdleSession(current.phase, settings));
  }, [settings]);

  const continueToNextPhase = useCallback(() => {
    setSession((current) => {
      if (current.status !== 'completed') return current;
      const completedFocusCount = history.length;
      return createIdleSession(nextPhaseAfter(current, completedFocusCount), settings);
    });
  }, [history.length, settings]);

  const updateSettings = useCallback((values) => {
    const nextSettings = sanitizeSettings(values);
    setSettings(nextSettings);
    setSession((current) => current.status === 'idle' ? createIdleSession(current.phase, nextSettings) : current);
  }, []);

  const updateDailyGoal = useCallback((value) => {
    setDailyGoalMinutes(sanitizeDailyGoal(value));
  }, []);

  const enablePomodoroNotifications = useCallback(async (enabled) => {
    if (!enabled) {
      setNotificationPreferences((value) => ({ ...value, pomodoroEnabled: false }));
      setNotificationError(null);
      return 'disabled';
    }
    const permission = await requestNotificationPermission().catch(() => 'unknown');
    setNotificationPermission(permission);
    if (permission === 'granted') {
      setNotificationError(null);
      setNotificationPreferences((value) => ({ ...value, pomodoroEnabled: true }));
    }
    return permission;
  }, []);

  const enableDailyReminder = useCallback(async (enabled) => {
    if (!enabled) {
      setNotificationPreferences((value) => ({ ...value, dailyReminderEnabled: false }));
      setNotificationError(null);
      return 'disabled';
    }
    const permission = await requestNotificationPermission().catch(() => 'unknown');
    setNotificationPermission(permission);
    if (permission === 'granted') {
      setNotificationError(null);
      setNotificationPreferences((value) => ({ ...value, dailyReminderEnabled: true }));
    }
    return permission;
  }, []);

  const updateReminderTime = useCallback((hour, minute) => {
    setNotificationPreferences((value) => sanitizeNotificationPreferences({ ...value, reminderHour: hour, reminderMinute: minute }));
  }, []);

  const refreshNotificationPermission = useCallback(async () => {
    const permission = await getNotificationPermissionState().catch(() => 'unknown');
    setNotificationPermission(permission);
    return permission;
  }, []);

  useEffect(() => {
    if (!isReady) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshNotificationPermission();
    });
    return () => subscription.remove();
  }, [isReady, refreshNotificationPermission]);

  const todaySeconds = useMemo(() => {
    const today = localDateKey(currentLocalDate);
    return aggregateStudyDays(history)[today]?.seconds || 0;
  }, [currentLocalDate, history]);

  const value = useMemo(() => ({
    isReady,
    settings,
    session,
    history,
    dailyGoalMinutes,
    todaySeconds,
    currentLocalDate,
    notificationPreferences,
    notificationPermission,
    notificationError,
    start,
    pause,
    resume,
    cancel,
    continueToNextPhase,
    updateSettings,
    updateDailyGoal,
    enablePomodoroNotifications,
    enableDailyReminder,
    updateReminderTime,
    refreshNotificationPermission,
  }), [cancel, continueToNextPhase, currentLocalDate, dailyGoalMinutes, enableDailyReminder, enablePomodoroNotifications, history, isReady, notificationError, notificationPermission, notificationPreferences, pause, refreshNotificationPermission, resume, session, settings, start, todaySeconds, updateDailyGoal, updateReminderTime, updateSettings]);

  return <StudyModeContext.Provider value={value}>{children}</StudyModeContext.Provider>;
}

export function useStudyMode() {
  const context = useContext(StudyModeContext);
  if (!context) throw new Error('useStudyMode deve ser usado dentro de StudyModeProvider.');
  return context;
}

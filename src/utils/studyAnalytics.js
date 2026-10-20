import { localDateKey } from './studyModeUtils';

export const DEFAULT_DAILY_GOAL_MINUTES = 30;
export const DAILY_GOAL_LIMITS = Object.freeze({ min: 5, max: 480 });
export const DAILY_GOAL_PRESETS = Object.freeze([15, 30, 60, 120]);

export function sanitizeDailyGoal(value) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return DEFAULT_DAILY_GOAL_MINUTES;
  return Math.min(DAILY_GOAL_LIMITS.max, Math.max(DAILY_GOAL_LIMITS.min, parsed));
}

function validLocalDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? value : null;
}

export function sessionDateKey(session) {
  const storedKey = validLocalDateKey(session?.localDate);
  if (storedKey) return storedKey;
  const date = new Date(session?.completedAt);
  return Number.isNaN(date.getTime()) ? null : localDateKey(date);
}

export function aggregateStudyDays(history = []) {
  const days = {};
  const seenIds = new Set();
  for (const session of Array.isArray(history) ? history : []) {
    if (session?.id && seenIds.has(session.id)) continue;
    const key = sessionDateKey(session);
    const durationSeconds = Number(session?.durationSeconds);
    if (!key || !Number.isFinite(durationSeconds) || durationSeconds <= 0) continue;
    if (session?.id) seenIds.add(session.id);
    if (!days[key]) days[key] = { dateKey: key, seconds: 0, sessions: 0 };
    days[key].seconds += durationSeconds;
    days[key].sessions += 1;
  }
  return days;
}

export function addLocalDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12);
}

function keyOrdinal(key) {
  const [year, month, day] = key.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export function calculateStreaks(history = [], now = new Date()) {
  const keys = Object.keys(aggregateStudyDays(history)).sort();
  if (keys.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let index = 1; index < keys.length; index += 1) {
    if (keyOrdinal(keys[index]) - keyOrdinal(keys[index - 1]) === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
  }

  const todayKey = localDateKey(now);
  const yesterdayKey = localDateKey(addLocalDays(now, -1));
  const lastKey = keys[keys.length - 1];
  if (lastKey !== todayKey && lastKey !== yesterdayKey) return { current: 0, longest };

  let current = 1;
  for (let index = keys.length - 1; index > 0; index -= 1) {
    if (keyOrdinal(keys[index]) - keyOrdinal(keys[index - 1]) !== 1) break;
    current += 1;
  }
  return { current, longest };
}

export function calculateGoalProgress(todaySeconds, goalMinutes) {
  const safeGoal = sanitizeDailyGoal(goalMinutes);
  const safeSeconds = Math.max(0, Number(todaySeconds) || 0);
  const ratio = safeSeconds / (safeGoal * 60);
  return {
    studiedMinutes: Math.floor(safeSeconds / 60),
    goalMinutes: safeGoal,
    percentage: ratio >= 1 ? Math.round(ratio * 100) : Math.floor(ratio * 100),
    visualProgress: Math.min(1, ratio),
    reached: ratio >= 1,
  };
}

export function calculateStudyStatistics(history = [], now = new Date()) {
  const days = aggregateStudyDays(history);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = addLocalDays(today, index - 6);
    const key = localDateKey(date);
    return { date, dateKey: key, seconds: days[key]?.seconds || 0, sessions: days[key]?.sessions || 0 };
  });
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`;
  const values = Object.values(days);
  const totalSeconds = values.reduce((total, day) => total + day.seconds, 0);
  const last7DaysSeconds = weekly.reduce((total, day) => total + day.seconds, 0);
  const monthSeconds = values.reduce((total, day) => day.dateKey.startsWith(monthPrefix) ? total + day.seconds : total, 0);
  const streaks = calculateStreaks(history, now);

  return {
    totalSeconds,
    totalSessions: values.reduce((total, day) => total + day.sessions, 0),
    last7DaysSeconds,
    monthSeconds,
    averageDailyLast7Seconds: last7DaysSeconds / 7,
    longestStreak: streaks.longest,
    weekly,
  };
}

export function buildCalendarMonth(year, month, history = []) {
  const days = aggregateStudyDays(history);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmpty = new Date(year, month, 1, 12).getDay();
  const cells = Array.from({ length: leadingEmpty }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day, 12);
    const dateKey = localDateKey(date);
    cells.push({ day, date, dateKey, seconds: days[dateKey]?.seconds || 0, sessions: days[dateKey]?.sessions || 0 });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}


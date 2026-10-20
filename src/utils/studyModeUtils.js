export const DEFAULT_STUDY_SETTINGS = Object.freeze({
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
});

export const SETTING_LIMITS = Object.freeze({
  focusMinutes: { min: 1, max: 120 },
  shortBreakMinutes: { min: 1, max: 60 },
  longBreakMinutes: { min: 1, max: 90 },
});

export function clampSetting(value, key) {
  const limits = SETTING_LIMITS[key];
  const parsed = Math.round(Number(value));
  if (!limits || !Number.isFinite(parsed)) return DEFAULT_STUDY_SETTINGS[key];
  return Math.min(limits.max, Math.max(limits.min, parsed));
}

export function sanitizeSettings(settings = {}) {
  return Object.fromEntries(
    Object.keys(DEFAULT_STUDY_SETTINGS).map((key) => [key, clampSetting(settings[key], key)]),
  );
}

export function durationForPhase(phase, settings) {
  const key = phase === 'focus' ? 'focusMinutes' : phase === 'longBreak' ? 'longBreakMinutes' : 'shortBreakMinutes';
  return settings[key] * 60;
}

export function remainingFromEndTime(endsAt, now = Date.now()) {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function elapsedWhileRunning(session, now = Date.now()) {
  if (!session?.runStartedAt) return session?.elapsedSeconds || 0;
  const currentRun = Math.max(0, (now - session.runStartedAt) / 1000);
  return Math.min(session.durationSeconds, (session.elapsedSeconds || 0) + currentRun);
}

export function nextPhaseAfter(session, completedFocusCount) {
  if (session.phase !== 'focus') return 'focus';
  return completedFocusCount % 4 === 0 ? 'longBreak' : 'shortBreak';
}

export function formatClock(totalSeconds) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function studyModeStorageKeyFor(userId) {
  if (userId === undefined || userId === null || userId === '') {
    throw new Error('O ID do usuário é obrigatório para acessar o StudyMode.');
  }
  return `studyconnect.studymode.v1.${encodeURIComponent(String(userId))}`;
}


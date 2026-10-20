const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

function loadJavaScriptModule(relativePath) {
  const filename = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const code = babel.transformSync(source, { plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  require.cache[filename] = loaded;
  loaded._compile(code, filename);
  return loaded.exports;
}

const studyModeUtils = loadJavaScriptModule('../src/utils/studyModeUtils.js');
const {
  aggregateStudyDays,
  buildCalendarMonth,
  calculateGoalProgress,
  calculateStreaks,
  calculateStudyStatistics,
} = loadJavaScriptModule('../src/utils/studyAnalytics.js');
const { studyModeStorageKeyFor } = studyModeUtils;

function session(id, localDate, minutes = 25) {
  return { id, localDate, durationSeconds: minutes * 60, completedAt: `${localDate}T15:00:00.000Z` };
}

const march10 = new Date(2026, 2, 10, 12);

assert.deepEqual(calculateStreaks([session('a', '2026-03-10')], march10), { current: 1, longest: 1 });
assert.deepEqual(calculateStreaks([session('a', '2026-03-09'), session('b', '2026-03-10')], march10), { current: 2, longest: 2 });
assert.deepEqual(calculateStreaks([
  session('a', '2026-03-07'), session('b', '2026-03-08'), session('c', '2026-03-09'), session('d', '2026-03-10'),
], march10), { current: 4, longest: 4 });
assert.equal(calculateStreaks([session('a', '2026-03-09')], march10).current, 1);
assert.deepEqual(calculateStreaks([session('a', '2026-03-05'), session('b', '2026-03-06')], march10), { current: 0, longest: 2 });

const duplicateDay = [session('a', '2026-03-10'), session('b', '2026-03-10', 30)];
assert.deepEqual(calculateStreaks(duplicateDay, march10), { current: 1, longest: 1 });
assert.deepEqual(aggregateStudyDays(duplicateDay)['2026-03-10'], { dateKey: '2026-03-10', seconds: 3300, sessions: 2 });
assert.equal(aggregateStudyDays([...duplicateDay, session('a', '2026-03-10')])['2026-03-10'].sessions, 2);

assert.equal(calculateStreaks([session('a', '2025-12-31'), session('b', '2026-01-01')], new Date(2026, 0, 1, 12)).current, 2);
assert.equal(calculateStreaks([
  session('a', '2024-02-28'), session('b', '2024-02-29'), session('c', '2024-03-01'),
], new Date(2024, 2, 1, 12)).current, 3);
assert.equal(buildCalendarMonth(2024, 1, []).filter(Boolean).length, 29);
assert.equal(buildCalendarMonth(2025, 1, []).filter(Boolean).length, 28);

assert.equal(calculateGoalProgress(30 * 60, 30).reached, true);
assert.deepEqual(calculateGoalProgress(90 * 60, 60), { studiedMinutes: 90, goalMinutes: 60, percentage: 150, visualProgress: 1, reached: true });
assert.deepEqual(calculateStreaks([], march10), { current: 0, longest: 0 });
assert.equal(calculateStudyStatistics([], march10).totalSessions, 0);

const statisticsHistory = [
  session('a', '2026-03-04', 14),
  session('b', '2026-03-10', 28),
  session('old', '2026-02-28', 60),
];
const statistics = calculateStudyStatistics(statisticsHistory, march10);
assert.equal(statistics.last7DaysSeconds, 42 * 60);
assert.equal(statistics.averageDailyLast7Seconds, 6 * 60);
assert.equal(statistics.monthSeconds, 42 * 60);
assert.equal(statistics.totalSessions, 3);

assert.notEqual(studyModeStorageKeyFor('user-a'), studyModeStorageKeyFor('user-b'));
assert.equal(studyModeStorageKeyFor('user/a'), 'studyconnect.studymode.v1.user%2Fa');

console.log('studyAnalytics: 21 scenarios passed');

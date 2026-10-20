const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

const calls = { scheduled: [], canceled: [], channels: [], requested: 0, handler: null };
let permission = { granted: false, status: 'undetermined', canAskAgain: true };
let scheduledRequests = [];
let nextIdentifier = 1;
let cancelShouldFail = false;
let scheduleShouldFail = false;

const notificationMock = {
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
  setNotificationHandler(handler) { calls.handler = handler; },
  async setNotificationChannelAsync(id, config) { calls.channels.push({ id, config }); },
  async getPermissionsAsync() { return permission; },
  async requestPermissionsAsync() { calls.requested += 1; return permission; },
  async scheduleNotificationAsync(request) {
    if (scheduleShouldFail) throw new Error('scheduler failure');
    const identifier = `notification-${nextIdentifier++}`;
    calls.scheduled.push({ identifier, request });
    return identifier;
  },
  async cancelScheduledNotificationAsync(identifier) {
    calls.canceled.push(identifier);
    if (cancelShouldFail) throw new Error('missing identifier');
  },
  async getAllScheduledNotificationsAsync() { return scheduledRequests; },
};

const reactNativeMock = {
  Platform: { OS: 'android' },
  Linking: { async openSettings() {} },
};

function loadWithMocks(relativePath) {
  const filename = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const code = babel.transformSync(source, { plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalLoad = Module._load;
  Module._load = function mockLoad(request, parent, isMain) {
    if (request === 'expo-notifications') return notificationMock;
    if (request === 'react-native') return reactNativeMock;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    loaded._compile(code, filename);
  } finally {
    Module._load = originalLoad;
  }
  return loaded.exports;
}

const service = loadWithMocks('../src/services/notificationService.js');

(async () => {
  assert.ok(calls.handler, 'configura o comportamento em primeiro plano');

  permission = { granted: false, status: 'denied', canAskAgain: false };
  assert.equal(await service.requestNotificationPermission(), 'blocked');
  assert.equal(calls.requested, 0, 'não repete solicitação bloqueada');

  permission = { granted: true, status: 'granted', canAskAgain: true };
  const focusId = await service.schedulePomodoroNotification({ userId: 'user-a', sessionId: 'focus-1', phase: 'focus', endsAt: Date.now() + 60000 });
  assert.equal(focusId, 'notification-1');
  assert.equal(calls.scheduled[0].request.content.title, 'Foco concluído!');
  assert.equal(calls.scheduled[0].request.content.data.userId, 'user-a');
  assert.equal(calls.scheduled[0].request.trigger.type, 'date');

  await service.cancelNotification(focusId);
  assert.deepEqual(calls.canceled, ['notification-1'], 'pausa ou encerramento cancela o aviso');

  const resumedId = await service.schedulePomodoroNotification({ userId: 'user-a', sessionId: 'focus-1', phase: 'focus', endsAt: Date.now() + 120000 });
  assert.notEqual(resumedId, focusId, 'retomada recebe um novo agendamento');

  const reminderId = await service.scheduleDailyReminder({ userId: 'user-a', hour: 19, minute: 30 });
  assert.equal(calls.scheduled.at(-1).request.trigger.type, 'daily');
  assert.equal(calls.scheduled.at(-1).request.trigger.hour, 19);
  await service.cancelNotification(reminderId);
  const changedReminderId = await service.scheduleDailyReminder({ userId: 'user-a', hour: 20, minute: 15 });
  assert.notEqual(changedReminderId, reminderId, 'alteração de horário substitui o identificador');

  const otherUserId = await service.scheduleDailyReminder({ userId: 'user-b', hour: 20, minute: 15 });
  assert.equal(calls.scheduled.at(-1).request.content.data.userId, 'user-b');
  assert.notEqual(otherUserId, changedReminderId, 'contas diferentes não compartilham identificadores');

  scheduledRequests = [{ identifier: resumedId }, { identifier: changedReminderId }];
  const restoredIds = await service.getScheduledNotificationIds();
  assert.equal(restoredIds.has(resumedId), true);
  assert.equal(restoredIds.has('inexistente'), false);

  cancelShouldFail = true;
  await assert.doesNotReject(() => service.cancelNotification('expirado'));
  await assert.doesNotReject(() => service.cancelNotification(null));
  scheduleShouldFail = true;
  await assert.rejects(() => service.scheduleDailyReminder({ userId: 'user-a', hour: 8, minute: 0 }), /scheduler failure/);

  console.log('studyNotifications: 13 mocked scenarios passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

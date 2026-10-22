/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const babel = require('@babel/core');

const singletonAdapter = {
  async getItem() { return null; },
  async setItem() {},
};

const filename = path.resolve(__dirname, '../src/onboarding/storage.js');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded.require = (name) => name === '@react-native-async-storage/async-storage'
  ? singletonAdapter
  : Module.prototype.require.call(loaded, name);
loaded._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code, filename);

const { createOnboardingStore, onboardingStore, default: defaultStore } = loaded.exports;

function memory(initial = {}) {
  const items = new Map(Object.entries(initial));
  let nextSetError = null;
  let nextGetError = null;
  return {
    items,
    failNextSet(error = new Error('storage failure')) { nextSetError = error; },
    failNextGet(error = new Error('read failure')) { nextGetError = error; },
    async getItem(key) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (nextGetError) {
        const error = nextGetError;
        nextGetError = null;
        throw error;
      }
      return items.has(key) ? items.get(key) : null;
    },
    async setItem(key, value) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      if (nextSetError) {
        const error = nextSetError;
        nextSetError = null;
        throw error;
      }
      items.set(key, value);
    },
    async removeItem(key) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      items.delete(key);
    },
  };
}

test('exports a real singleton and rejects invalid signup DTOs', async () => {
  assert.equal(defaultStore, onboardingStore);
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  assert.equal(await store.recordSignup({ id: null, email: 'a@example.com' }), null);
  assert.equal(await store.recordSignup({ id: 1, email: 'invalid' }), null);
  assert.equal(await store.recordSignup({ id: 'undefined', email: 'a@example.com' }), null);
  assert.equal(await store.recordSignup({ id: '01', email: 'a@example.com' }), null);
  assert.equal(await store.recordSignup({ id: Number.MAX_SAFE_INTEGER + 1, email: 'a@example.com' }), null);
  assert.equal(adapter.items.size, 0);
});

test('signup is local, isolated by ID, and only eligible after verification', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const userA = { id: 101, email: 'ALICE@Example.com' };
  const userB = { id: 102, email: 'bob@example.com' };

  const signup = await store.recordSignup({ id: userA.id, email: ' Alice@Example.COM ' });
  assert.equal(signup.userId, '101');
  assert.equal(signup.email, 'alice@example.com');
  assert.equal(signup.origin, 'email-signup');
  assert.equal(signup.verified, false);
  assert.equal(signup.status, 'pending');
  assert.deepEqual(signup.draft, {});
  assert.ok(adapter.items.has('studyconnect:onboarding:v1:101'));
  assert.equal(await store.read(userA), null, 'unfinished email signup cannot auto start');
  assert.equal(await store.markVerified('unknown@example.com'), null);

  const verified = await store.markVerified(' ALICE@example.com ');
  assert.equal(verified.verified, true);
  assert.equal(verified.status, 'active');
  assert.equal((await store.read(userA)).status, 'active');
  assert.equal(await store.read({ id: 101, email: userB.email }), null);
  assert.equal(await store.read(userB), null);
  assert.equal(await store.read({ id: 102, email: userA.email }), null, 'same email under another ID has no local state');
  assert.deepEqual(await store.markVerified('alice@example.com'), verified, 'verification is idempotent');

  const repeated = await store.recordSignup({ id: 101, email: 'alice@example.com' });
  assert.equal(repeated.verified, true, 'repeating signup cannot reset verified progress');
  assert.equal(await store.recordSignup({ id: 101, email: userB.email }), null, 'ID cannot be reassigned to another email');
});

test('authenticated manual start can convert only a matching pending signup', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const user = { id: 31, email: 'pending@example.com' };
  await store.recordSignup(user);
  assert.equal(await store.start({ id: 31, email: 'different@example.com' }), null);
  assert.equal((await store.read(user)), null);
  const manual = await store.start(user);
  assert.equal(manual.origin, 'manual');
  assert.equal(manual.status, 'active');
  assert.equal(manual.verified, false);
  assert.equal((await store.read(user)).origin, 'manual');
  assert.equal(await store.markVerified(user.email), null, 'old email index cannot change a manual tour');
});

test('only an indexed, matching email signup can be verified', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const googleUser = { id: 30, email: 'google@example.com' };
  assert.equal(await store.read(googleUser), null, 'old Google account has no automatic onboarding');
  assert.equal((await store.start(googleUser)).origin, 'manual');
  assert.equal(await store.markVerified(googleUser.email), null, 'manual tour is not email signup');

  adapter.items.set('studyconnect:onboarding-email:v1:else%40example.com', '30');
  assert.equal(await store.markVerified('else@example.com'), null, 'stale/mismatched index is inert');
  assert.equal((await store.read(googleUser)).verified, false);
});

test('update reloads and merges allowed progress without identity or secret fields', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const user = { id: 5, email: 'five@example.com' };
  await store.start(user);

  await Promise.all([
    store.update(user, { step: 2, draft: { objetivo: 'ENEM' } }),
    store.update(user, { part: 1, draft: { ritmo: 'LEVE' } }),
  ]);
  const next = await store.update(user, {
    version: 9, userId: '999', email: 'other@example.com', origin: 'email-signup', verified: true,
    status: 'paused', question: 5, profileSaved: true, selectedTrailId: 123,
    draft: { senha: 'secret', accessToken: 'secret', interesses: ['Matemática'] },
  });
  assert.equal(next.version, 1);
  assert.equal(next.userId, '5');
  assert.equal(next.email, user.email);
  assert.equal(next.origin, 'manual');
  assert.equal(next.verified, false);
  assert.equal(next.status, 'paused');
  assert.equal(next.step, 2);
  assert.equal(next.part, 1);
  assert.equal(next.question, 5);
  assert.equal(next.profileSaved, true);
  assert.equal(next.selectedTrailId, '123');
  assert.deepEqual(next.draft, { objetivo: 'ENEM', ritmo: 'LEVE', interesses: ['Matemática'] });
  assert.equal(adapter.items.get('studyconnect:onboarding:v1:5').includes('secret'), false);
  assert.equal(await store.read({ id: 5, email: 'other@example.com' }), null);

  const invalid = await store.update(user, { step: 10, part: -1, status: 'pending', selectedTrailId: {} });
  assert.equal(invalid.step, 2);
  assert.equal(invalid.part, 1);
  assert.equal(invalid.status, 'paused');
  assert.equal(invalid.selectedTrailId, '123');
  assert.equal((await store.update(user, { selectedTrailId: 'undefined' })).selectedTrailId, '123');
});

test('completion stays completed until explicit manual replay and keeps completedAt', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const user = { id: 77, email: 'complete@example.com' };
  await store.start(user);
  await store.update(user, { selectedTrailId: 'older-trail' });
  const completed = await store.update(user, { status: 'completed', step: 5, part: 3, question: 5 });
  assert.ok(Date.parse(completed.completedAt));
  assert.equal((await store.read(user)).status, 'completed');
  assert.equal((await store.update(user, { status: 'active', step: 0 })).status, 'completed', 'update cannot implicitly replay');

  const replay = await store.start(user);
  assert.equal(replay.status, 'active');
  assert.equal(replay.step, 0);
  assert.equal(replay.part, 0);
  assert.equal(replay.question, 0);
  assert.equal(replay.selectedTrailId, null, 'replay cannot reopen the previous trail');
  assert.equal(replay.completedAt, completed.completedAt, 'manual replay retains completion marker');
});

test('completion requires the final step and malformed completed records remain ineligible', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const user = { id: 78, email: 'early@example.com' };
  await store.start(user);
  const early = await store.update(user, { status: 'completed', completedAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(early.status, 'active');
  assert.equal(early.completedAt, null);
  const almost = await store.update(user, { step: 4, status: 'completed' });
  assert.equal(almost.status, 'active');
  assert.equal(almost.completedAt, null);
  const complete = await store.update(user, { step: 5, status: 'completed' });
  assert.equal(complete.status, 'completed');

  const key = 'studyconnect:onboarding:v1:78';
  adapter.items.set(key, JSON.stringify({ ...complete, step: 4 }));
  assert.equal(await store.read(user), null);
  assert.equal(await store.start(user), null, 'corrupt completion is not overwritten');
  assert.equal(JSON.parse(adapter.items.get(key)).step, 4);
});

test('failed writes reject without poisoning subsequent writes', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const user = { id: 9, email: 'retry@example.com' };
  await store.start(user);
  adapter.failNextSet();
  await assert.rejects(() => store.update(user, { step: 2 }), /storage failure/);
  assert.equal((await store.read(user)).step, 0);
  assert.equal((await store.update(user, { step: 3 })).step, 3);
});

test('a failed signup record write leaves no eligible account and can be retried', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const user = { id: 18, email: 'retry-signup@example.com' };
  const originalSet = adapter.setItem.bind(adapter);
  let failRecordOnce = true;
  adapter.setItem = async (key, value) => {
    if (key === 'studyconnect:onboarding:v1:18' && failRecordOnce) {
      failRecordOnce = false;
      throw new Error('account write failure');
    }
    return originalSet(key, value);
  };

  await assert.rejects(() => store.recordSignup(user), /account write failure/);
  assert.equal(await store.markVerified(user.email), null, 'email index alone cannot verify');
  assert.equal(await store.read(user), null);
  assert.equal((await store.recordSignup(user)).status, 'pending');
  assert.equal((await store.markVerified(user.email)).status, 'active');
});

test('failed email index write leaves no account and a retry can verify it', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const user = { id: 19, email: 'index-failure@example.com' };
  adapter.failNextSet(new Error('index write failure'));
  await assert.rejects(() => store.recordSignup(user), /index write failure/);
  assert.equal(adapter.items.has('studyconnect:onboarding:v1:19'), false);
  assert.equal(await store.read(user), null);
  assert.equal(await store.markVerified(user.email), null);
  assert.equal((await store.recordSignup(user)).status, 'pending');
  assert.equal((await store.markVerified(user.email)).status, 'active');
});

test('failed verification write keeps signup pending and can be retried', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const user = { id: 20, email: 'verify-failure@example.com' };
  await store.recordSignup(user);
  adapter.failNextSet(new Error('verification write failure'));
  await assert.rejects(() => store.markVerified(user.email), /verification write failure/);
  assert.equal(await store.read(user), null);
  assert.equal((await store.markVerified(user.email)).status, 'active');
  assert.equal((await store.read(user)).verified, true);
});

test('failed reads reject and do not poison later reads or writes', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const user = { id: 21, email: 'read-failure@example.com' };
  await store.start(user);
  adapter.failNextGet();
  await assert.rejects(() => store.read(user), /read failure/);
  assert.equal((await store.read(user)).step, 0);
  assert.equal((await store.update(user, { step: 2 })).step, 2);
});

test('corrupt records and mismatched identity are never returned', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const user = { id: 11, email: 'corrupt@example.com' };
  const key = 'studyconnect:onboarding:v1:11';
  await store.start(user);
  const valid = JSON.parse(adapter.items.get(key));

  for (const value of ['{', JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, userId: '12' }), JSON.stringify({ ...valid, draft: { senha: 'secret' } })]) {
    adapter.items.set(key, value);
    assert.equal(await store.read(user), null);
    assert.equal(await store.start(user), null, 'corrupt record cannot be silently replaced');
    assert.equal(await store.recordSignup(user), null, 'new signup cannot replace a corrupt account');
    assert.equal(adapter.items.get(key), value);
  }
  adapter.items.set(key, JSON.stringify(valid));
  assert.equal(await store.read({ id: 11, email: 'different@example.com' }), null);
  assert.equal((await store.read(user)).userId, '11');
});

test('account cleanup is isolated and prevents deleted onboarding writes', async () => {
  const adapter = memory();
  const store = createOnboardingStore(adapter);
  const alice = { id: 301, email: 'alice-cleanup@example.com' };
  const bob = { id: 302, email: 'bob-cleanup@example.com' };
  await store.recordSignup(alice);
  await store.markVerified(alice.email);
  await store.start(bob);

  assert.equal(await store.clear(alice), true);
  assert.equal(await store.read(alice), null);
  assert.equal(await store.update(alice, { step: 2 }), null);
  assert.equal(await store.markVerified(alice.email), null);
  assert.equal(adapter.items.has('studyconnect:onboarding:v1:301'), false);
  assert.equal(adapter.items.has('studyconnect:onboarding-email:v1:alice-cleanup%40example.com'), false);
  assert.equal((await store.read(bob)).status, 'active');
});

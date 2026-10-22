const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

const values = new Map();
const calls = [];
const filename = path.resolve(__dirname, '../src/services/studyModeStorage.js');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded.require = (name) => {
  if (name === '@react-native-async-storage/async-storage') {
    return {
      getItem: async (key) => values.get(key) || null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { calls.push(key); values.delete(key); },
    };
  }
  if (name === '../utils/studyModeUtils') {
    return {
      studyModeStorageKeyFor: (userId) => `studyconnect.studymode.v1.${encodeURIComponent(String(userId))}`,
    };
  }
  return Module.prototype.require.call(loaded, name);
};
loaded._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code, filename);

const { clearStudyModeData, saveStudyModeData } = loaded.exports;

(async () => {
  await saveStudyModeData(42, { history: [{ id: 'study-1' }] });
  await saveStudyModeData(43, { history: [{ id: 'study-2' }] });
  await clearStudyModeData(42);

  assert.equal(values.has('studyconnect.studymode.v1.42'), false);
  assert.equal(values.get('studyconnect.studymode.v1.43'), '{"history":[{"id":"study-2"}]}');
  assert.deepEqual(calls, ['studyconnect.studymode.v1.42']);
  await saveStudyModeData(42, { history: [{ id: 'late-write' }] });
  assert.equal(values.has('studyconnect.studymode.v1.42'), false, 'a late save cannot recreate deleted account data');
  assert.equal(values.get('studyconnect.studymode.v1.43'), '{"history":[{"id":"study-2"}]}');

  console.log('StudyMode storage: deleting an account clears only its local data.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

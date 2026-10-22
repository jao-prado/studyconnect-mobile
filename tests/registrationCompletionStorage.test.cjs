const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

const values = new Map();
const filename = path.resolve(__dirname, '../src/services/registrationCompletionStorage.js');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded.require = (name) => {
  if (name === 'expo-secure-store') {
    return {
      setItemAsync: async (key, value) => values.set(key, value),
      getItemAsync: async (key) => values.get(key) || null,
      deleteItemAsync: async (key) => values.delete(key),
    };
  }
  return Module.prototype.require.call(loaded, name);
};
loaded._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code, filename);

const { clearRegistrationCompletion, readRegistrationCompletion, saveRegistrationCompletion } = loaded.exports;

(async () => {
  await saveRegistrationCompletion(' Student@Example.com ', 'one-time-registration-token');
  assert.equal(await readRegistrationCompletion('student@example.com'), 'one-time-registration-token');
  assert.equal(values.get('studyconnect.registration-completion').includes('senha'), false);
  assert.equal(await readRegistrationCompletion('other@example.com'), null);
  await clearRegistrationCompletion();
  assert.equal(await readRegistrationCompletion('student@example.com'), null);

  console.log('Registration completion token: SecureStore contract and email binding OK.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

const calls = [];
const filename = path.resolve(__dirname, '../src/services/authService.js');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded.require = (name) => {
  if (name === './apiClient') {
    return {
      apiRequest: async (requestPath, options) => {
        calls.push({ requestPath, options });
        return { id: 17, email: 'student@example.com', registrationToken: 'opaque-token' };
      },
    };
  }
  return Module.prototype.require.call(loaded, name);
};
loaded._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code, filename);

const { registerStudent, verifyEmail } = loaded.exports;

(async () => {
  await registerStudent('Aluno', 'student@example.com', 'Never-persist-this');
  assert.deepEqual(calls.pop(), {
    requestPath: '/auth/register',
    options: {
      method: 'POST',
      auth: false,
      body: { nome: 'Aluno', email: 'student@example.com', senha: 'Never-persist-this' },
    },
  });

  await verifyEmail('student@example.com', '123456', 'opaque-token');
  assert.deepEqual(calls.pop(), {
    requestPath: '/auth/verify-email',
    options: {
      method: 'POST',
      auth: false,
      body: { email: 'student@example.com', code: '123456', registrationToken: 'opaque-token' },
    },
  });

  await verifyEmail('student@example.com', '123456');
  assert.deepEqual(calls.pop(), {
    requestPath: '/auth/verify-email',
    options: {
      method: 'POST',
      auth: false,
      body: { email: 'student@example.com', code: '123456' },
    },
  });

  console.log('Auth service: signup and registration-bound verification contracts OK.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

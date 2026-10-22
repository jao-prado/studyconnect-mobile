const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

const calls = [];
const responses = [];
const filename = path.resolve(__dirname, '../src/services/usuarioService.js');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded.require = (name) => {
  if (name === './apiClient') {
    return { apiRequest: async (requestPath, options) => {
      calls.push({ requestPath, options });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response || { ok: true };
    } };
  }
  return Module.prototype.require.call(loaded, name);
};
loaded._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code, filename);

const {
  requestAccountDeletionCode,
  deleteAccount,
  getAccountSecurity,
  requestAccountDeletionChallenge,
  deleteOwnAccount,
} = loaded.exports;

(async () => {
  await requestAccountDeletionCode(42, 'senha-segura');
  assert.deepEqual(calls.pop(), {
    requestPath: '/usuarios/42/delete-challenge',
    options: { method: 'POST', body: { senha: 'senha-segura' } },
  });

  await requestAccountDeletionCode(42, null);
  assert.deepEqual(calls.pop(), {
    requestPath: '/usuarios/42/delete-challenge',
    options: { method: 'POST', body: {} },
  });

  await deleteAccount(42, { senha: 'senha-segura', codigoMfa: '123456' });
  assert.deepEqual(calls.pop(), {
    requestPath: '/usuarios/42',
    options: {
      method: 'DELETE',
      body: { senha: 'senha-segura', codigoMfa: '123456' },
      logoutOnUnauthorized: false,
    },
  });

  await deleteAccount(42, { senha: null, codigoMfa: '654321' });
  assert.deepEqual(calls.pop(), {
    requestPath: '/usuarios/42',
    options: {
      method: 'DELETE',
      body: { codigoMfa: '654321' },
      logoutOnUnauthorized: false,
    },
  });

  const serverErrorAfterDeletion = Object.assign(new Error('Erro interno do servidor.'), { status: 500 });
  const accountNotFound = Object.assign(new Error('Usuário não encontrado.'), { status: 404 });
  responses.push(serverErrorAfterDeletion, accountNotFound);
  await deleteAccount(42, { senha: 'senha-segura', codigoMfa: '123456' });
  assert.deepEqual(calls.splice(-2), [
    {
      requestPath: '/usuarios/42',
      options: {
        method: 'DELETE',
        body: { senha: 'senha-segura', codigoMfa: '123456' },
        logoutOnUnauthorized: false,
      },
    },
    { requestPath: '/usuarios/42', options: undefined },
  ]);

  const serverErrorWithoutDeletion = Object.assign(new Error('Erro interno do servidor.'), { status: 500 });
  responses.push(serverErrorWithoutDeletion, { id: 42 });
  await assert.rejects(
    deleteAccount(42, { senha: 'senha-segura', codigoMfa: '123456' }),
    (error) => error === serverErrorWithoutDeletion,
  );

  await getAccountSecurity();
  assert.deepEqual(calls.pop(), { requestPath: '/auth/account-security', options: undefined });

  await requestAccountDeletionChallenge({ senha: 'senha-segura' });
  assert.deepEqual(calls.pop(), {
    requestPath: '/auth/account-deletion/challenge',
    options: { method: 'POST', body: { senha: 'senha-segura' } },
  });

  await requestAccountDeletionChallenge({ googleIdToken: 'google-id-token' });
  assert.deepEqual(calls.pop(), {
    requestPath: '/auth/account-deletion/challenge',
    options: { method: 'POST', body: { googleIdToken: 'google-id-token' } },
  });

  await deleteOwnAccount(42, { googleIdToken: 'google-id-token' });
  assert.deepEqual(calls.pop(), {
    requestPath: '/auth/account-deletion',
    options: {
      method: 'DELETE',
      body: { googleIdToken: 'google-id-token' },
      logoutOnUnauthorized: false,
    },
  });

  const newServerErrorAfterDeletion = Object.assign(new Error('Erro interno do servidor.'), { status: 500 });
  responses.push(newServerErrorAfterDeletion, accountNotFound);
  await deleteOwnAccount(42, { senha: 'senha-segura' });
  assert.deepEqual(calls.splice(-2), [
    {
      requestPath: '/auth/account-deletion',
      options: {
        method: 'DELETE',
        body: { senha: 'senha-segura' },
        logoutOnUnauthorized: false,
      },
    },
    { requestPath: '/usuarios/42', options: undefined },
  ]);

  console.log('Account deletion: legacy and authenticated self-delete contracts OK.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

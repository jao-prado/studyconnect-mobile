const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const projectRoot = require('node:process').cwd();

function loadModule(filename, replacements = {}) {
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (name) => replacements[name] ?? Module.prototype.require.call(loaded, name);
  loaded._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code, filename);
  return loaded.exports;
}

const profile = loadModule(path.join(projectRoot, 'src/onboarding/profile.js'));
const {
  GOAL_QUESTIONS,
  deriveMetaSemanal,
  isQuestionAnswered,
  validateProfileDraft,
  buildProfilePayload,
} = profile;

assert.deepEqual(GOAL_QUESTIONS.map((item) => item.id), [
  'objetivo', 'nivel', 'horasSemana', 'ritmo', 'interesses', 'dificuldades',
]);
assert.deepEqual(GOAL_QUESTIONS[0].options.map((item) => item.value), [
  'ENEM', 'VESTIBULAR', 'REFORCO', 'FACULDADE',
]);
assert.deepEqual(GOAL_QUESTIONS[2].options.map((item) => item.value), [1, 3, 5, 10]);
assert.equal(GOAL_QUESTIONS[4].options.length, 10);

const goalTable = [
  [1, 1, 2, 4], [3, 2, 4, 6], [5, 4, 6, 8], [10, 8, 10, 12],
];
for (const [hours, light, moderate, intense] of goalTable) {
  assert.equal(deriveMetaSemanal(hours, 'LEVE'), light);
  assert.equal(deriveMetaSemanal(hours, 'MODERADO'), moderate);
  assert.equal(deriveMetaSemanal(hours, 'INTENSO'), intense);
}
assert.throws(() => deriveMetaSemanal(7, 'MODERADO'));

const draft = {
  objetivo: 'ENEM',
  nivel: 'BASICO',
  horasSemana: 3,
  ritmo: 'MODERADO',
  interesses: ['Matemática', 'Português'],
  dificuldades: ['Química'],
};
assert.equal(validateProfileDraft(draft), null);
assert.equal(isQuestionAnswered(GOAL_QUESTIONS[4], { interesses: [] }), false);
assert.equal(isQuestionAnswered(GOAL_QUESTIONS[4], { interesses: ['Matemática', 'Matemática'] }), false);
assert.equal(validateProfileDraft({ ...draft, objetivo: 'OUTRO' }).question, 0);
assert.deepEqual(buildProfilePayload('42', draft), {
  alunoId: 42,
  objetivo: 'ENEM',
  nivel: 'BASICO',
  horasSemana: 3,
  metaSemanal: 4,
  ritmo: 'MODERADO',
  interesses: 'Matemática,Português',
  dificuldades: 'Química',
});
assert.throws(() => buildProfilePayload(42, { ...draft, interesses: [] }));
assert.throws(() => buildProfilePayload(0, draft));

const calls = [];
let response = null;
let failure = null;
const service = loadModule(path.join(projectRoot, 'src/services/perfilAprendizadoService.js'), {
  './apiClient': {
    apiRequest: async (requestPath, options) => {
      calls.push({ requestPath, options });
      if (failure) throw failure;
      return response;
    },
  },
});

(async () => {
  failure = { status: 404 };
  assert.equal(await service.findPerfilAprendizado(42), null);
  assert.deepEqual(calls.pop(), { requestPath: '/perfil-aprendizado/42', options: undefined });

  failure = { status: 503 };
  await assert.rejects(service.findPerfilAprendizado(42), (error) => error.status === 503);
  calls.pop();

  failure = null;
  response = { alunoId: 42, objetivo: 'ENEM' };
  assert.deepEqual(await service.getPerfilAprendizado(42), response);
  calls.pop();

  const payload = buildProfilePayload(42, draft);
  assert.deepEqual(await service.createPerfilAprendizado(payload), response);
  assert.deepEqual(calls.pop(), {
    requestPath: '/perfil-aprendizado',
    options: { method: 'POST', body: payload },
  });

  failure = { status: 409 };
  await assert.rejects(service.createPerfilAprendizado(payload), (error) => error.status === 409);
  assert.equal(calls.pop().requestPath, '/perfil-aprendizado');

  console.log('Onboarding profile: Web options, weekly goal, DTO validation and API errors OK.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

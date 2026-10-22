const DISCIPLINAS = [
  'Matemática', 'Português', 'Física', 'Química', 'Biologia',
  'História', 'Geografia', 'Inglês', 'Filosofia', 'Informática',
];

/** @typedef {{ value: string | number, label: string }} GoalOption */
/** @typedef {{ id: string, title: string, description: string, type: 'single' | 'multi', options: GoalOption[] }} GoalQuestion */

/** @type {GoalQuestion[]} */
export const GOAL_QUESTIONS = [
  {
    id: 'objetivo',
    title: 'Qual é o seu objetivo?',
    description: 'Isso nos ajuda a personalizar sua experiência.',
    type: 'single',
    options: [
      { value: 'ENEM', label: 'ENEM' },
      { value: 'VESTIBULAR', label: 'Vestibular' },
      { value: 'REFORCO', label: 'Reforço escolar' },
      { value: 'FACULDADE', label: 'Faculdade' },
    ],
  },
  {
    id: 'nivel',
    title: 'Qual é o seu nível atual?',
    description: 'Escolha o nível que melhor descreve seus estudos hoje.',
    type: 'single',
    options: [
      { value: 'BASICO', label: 'Básico' },
      { value: 'INTERMEDIARIO', label: 'Intermediário' },
      { value: 'AVANCADO', label: 'Avançado' },
    ],
  },
  {
    id: 'horasSemana',
    title: 'Quantas horas por semana você pode estudar?',
    description: 'Seja realista para montar uma meta alcançável.',
    type: 'single',
    options: [
      { value: 1, label: 'Menos de 1h' },
      { value: 3, label: '1h a 3h' },
      { value: 5, label: '3h a 5h' },
      { value: 10, label: 'Mais de 5h' },
    ],
  },
  {
    id: 'ritmo',
    title: 'Como você prefere estudar?',
    description: 'Seu ritmo ajuda a definir uma meta de aulas por semana.',
    type: 'single',
    options: [
      { value: 'LEVE', label: 'Leve — poucos conteúdos por vez' },
      { value: 'MODERADO', label: 'Moderado — equilíbrio entre quantidade e qualidade' },
      { value: 'INTENSO', label: 'Intenso — quanto mais, melhor' },
    ],
  },
  {
    id: 'interesses',
    title: 'Quais matérias você mais gosta?',
    description: 'Selecione quantas quiser.',
    type: 'multi',
    options: DISCIPLINAS.map((value) => ({ value, label: value })),
  },
  {
    id: 'dificuldades',
    title: 'Em quais matérias você tem mais dificuldade?',
    description: 'Selecione pelo menos uma matéria.',
    type: 'multi',
    options: DISCIPLINAS.map((value) => ({ value, label: value })),
  },
];

/** @param {number} horasSemana @param {string} ritmo */
export function deriveMetaSemanal(horasSemana, ritmo) {
  const bases = new Map([[1, 2], [3, 4], [5, 6], [10, 10]]);
  const base = bases.get(horasSemana);
  if (base === undefined || !['LEVE', 'MODERADO', 'INTENSO'].includes(ritmo)) {
    throw new Error('Escolha uma carga horária e um ritmo válidos.');
  }
  if (ritmo === 'INTENSO') return base + 2;
  if (ritmo === 'LEVE') return Math.max(1, base - 2);
  return base;
}

/** @param {GoalQuestion} question @param {Record<string, any>} draft */
export function isQuestionAnswered(question, draft) {
  const answer = draft?.[question.id];
  const allowed = question.options.map((option) => option.value);
  if (question.type === 'single') return allowed.includes(answer);
  return Array.isArray(answer)
    && answer.length > 0
    && new Set(answer).size === answer.length
    && answer.every((value) => allowed.includes(value));
}

/** @param {Record<string, any>} draft */
export function validateProfileDraft(draft) {
  const question = GOAL_QUESTIONS.findIndex((item) => !isQuestionAnswered(item, draft));
  if (question < 0) return null;
  return {
    question,
    message: GOAL_QUESTIONS[question].type === 'multi'
      ? 'Selecione pelo menos uma matéria para continuar.'
      : 'Selecione uma opção para continuar.',
  };
}

/** @param {number | string} userId @param {Record<string, any>} draft */
export function buildProfilePayload(userId, draft) {
  const alunoId = Number(userId);
  if (!Number.isSafeInteger(alunoId) || alunoId <= 0) {
    throw new Error('A sessão do aluno é inválida. Entre novamente.');
  }
  const validation = validateProfileDraft(draft);
  if (validation) throw new Error(validation.message);

  return {
    alunoId,
    objetivo: draft.objetivo,
    nivel: draft.nivel,
    horasSemana: draft.horasSemana,
    metaSemanal: deriveMetaSemanal(draft.horasSemana, draft.ritmo),
    ritmo: draft.ritmo,
    interesses: draft.interesses.join(','),
    dificuldades: draft.dificuldades.join(','),
  };
}

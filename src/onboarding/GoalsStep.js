import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { FeedbackMessage } from '../components/FeedbackMessage';
import { PrimaryButton } from '../components/PrimaryButton';
import { createPerfilAprendizado, findPerfilAprendizado, getPerfilAprendizado } from '../services/perfilAprendizadoService';
import { colors } from '../theme/colors';
import { controls, radii, spacing } from '../theme/tokens';
import { buildProfilePayload, GOAL_QUESTIONS, isQuestionAnswered, validateProfileDraft } from './profile';

/** @param {string} id @param {string | number | null | undefined} value */
function optionLabel(id, value) {
  const question = GOAL_QUESTIONS.find((item) => item.id === id);
  return question?.options.find((option) => option.value === value)?.label ?? String(value ?? '—');
}

/** @param {string | null | undefined} value */
function subjectList(value) {
  return value ? value.split(',').filter(Boolean).join(', ') : '—';
}

/**
 * @param {{
 *   userId: number | string,
 *   draft: Record<string, any>,
 *   question: number,
 *   onChange: (nextDraft: Record<string, any>) => Promise<void>,
 *   onQuestion: (number: number) => Promise<void>,
 *   onSaved: (profile: Record<string, any>) => Promise<void>,
 *   onBack: () => Promise<void> | void,
 *   busy?: boolean,
 * }} props
 */
export function GoalsStep({ userId, draft = {}, question, onChange, onQuestion, onSaved, onBack, busy = false }) {
  const [loadState, setLoadState] = useState('loading');
  const [profile, setProfile] = useState(/** @type {Record<string, any> | null} */ (null));
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [working, setWorking] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadedFor, setLoadedFor] = useState(/** @type {string | null} */ (null));
  const actionInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    findPerfilAprendizado(userId)
      .then((saved) => {
        if (!active) return;
        setProfile(saved);
        setLoadError('');
        setActionError('');
        setLoadState(saved ? 'existing' : 'questions');
        setLoadedFor(String(userId));
      })
      .catch(() => {
        if (!active) return;
        setProfile(null);
        setLoadError('Não foi possível carregar seus objetivos. Verifique sua conexão e tente novamente.');
        setLoadState('error');
        setLoadedFor(String(userId));
      });

    return () => { active = false; };
  }, [userId, retryCount]);

  const current = GOAL_QUESTIONS[question] ?? GOAL_QUESTIONS[0];
  const invalidQuestion = !Number.isInteger(question) || question < 0 || question >= GOAL_QUESTIONS.length;
  const shownState = loadedFor === String(userId) ? loadState : 'loading';
  const blocked = busy || working || shownState !== 'questions';

  function retry() {
    if (busy || working) return;
    setLoadState('loading');
    setLoadError('');
    setActionError('');
    setRetryCount((count) => count + 1);
  }

  /** @param {() => Promise<void> | void} action @param {string} failureMessage */
  async function runAction(action, failureMessage) {
    if (actionInFlight.current || busy) return;
    actionInFlight.current = true;
    setWorking(true);
    setActionError('');
    try {
      await action();
    } catch {
      setActionError(failureMessage);
    } finally {
      actionInFlight.current = false;
      setWorking(false);
    }
  }

  /** @param {string | number} value */
  function select(value) {
    if (blocked || invalidQuestion) return;
    const previous = draft[current.id];
    let answer;
    if (current.type === 'multi') {
      const selected = Array.isArray(previous) ? previous : [];
      answer = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
    } else {
      if (previous === value) return;
      answer = value;
    }
    const nextDraft = { ...draft, [current.id]: answer };
    void runAction(
      () => onChange(nextDraft),
      'Não foi possível salvar sua escolha. Tente novamente.',
    );
  }

  function back() {
    if (busy || working) return;
    void runAction(
      () => shownState === 'questions' && question > 0 ? onQuestion(question - 1) : onBack(),
      'Não foi possível voltar. Tente novamente.',
    );
  }

  function continueWithExisting() {
    if (!profile) return;
    void runAction(
      () => onSaved(profile),
      'Seus objetivos estão salvos, mas não foi possível avançar. Tente novamente.',
    );
  }

  function next() {
    if (blocked || invalidQuestion || !isQuestionAnswered(current, draft)) return;
    if (question < GOAL_QUESTIONS.length - 1) {
      void runAction(
        () => onQuestion(question + 1),
        'Não foi possível salvar seu avanço. Tente novamente.',
      );
      return;
    }

    const validation = validateProfileDraft(draft);
    if (validation) {
      void runAction(() => onQuestion(validation.question), validation.message);
      return;
    }

    void runAction(async () => {
      const payload = buildProfilePayload(userId, draft);
      let saved;
      try {
        saved = await createPerfilAprendizado(payload);
      } catch (error) {
        if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 409) throw error;
        try {
          const existing = await getPerfilAprendizado(userId);
          setProfile(existing);
          setLoadState('existing');
          setActionError('Já existe um perfil de aprendizado para esta conta. Use os objetivos salvos.');
        } catch {
          setLoadError('O perfil já existe, mas não foi possível carregá-lo. Tente novamente.');
          setLoadState('error');
        }
        return;
      }

      // Um erro posterior ao POST não deve provocar outro POST na tentativa seguinte.
      setProfile(saved);
      setLoadState('existing');
      try {
        await onSaved(saved);
      } catch {
        setActionError('Objetivos salvos, mas não foi possível avançar. Use os objetivos já salvos.');
      }
    }, 'Não foi possível salvar seus objetivos. Tente novamente.');
  }

  if (shownState === 'loading') {
    return (
      <View style={styles.center} accessibilityLiveRegion="polite">
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Carregando seus objetivos...</Text>
      </View>
    );
  }

  if (shownState === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Seus objetivos</Text>
        <FeedbackMessage>{loadError}</FeedbackMessage>
        <PrimaryButton title="Voltar" variant="secondary" onPress={back} style={undefined} />
        <PrimaryButton title="Tentar novamente" disabled={busy || working} onPress={retry} style={undefined} />
      </View>
    );
  }

  if (shownState === 'existing' && profile) {
    const summary = [
      ['Objetivo', optionLabel('objetivo', profile.objetivo)],
      ['Nível', optionLabel('nivel', profile.nivel)],
      ['Tempo disponível', optionLabel('horasSemana', profile.horasSemana)],
      ['Ritmo', optionLabel('ritmo', profile.ritmo)],
      ['Meta semanal', profile.metaSemanal == null ? '—' : `${profile.metaSemanal} aulas`],
      ['Interesses', subjectList(profile.interesses)],
      ['Dificuldades', subjectList(profile.dificuldades)],
    ];
    return (
      <View style={styles.container}>
        <Text style={styles.eyebrow}>SEUS OBJETIVOS</Text>
        <Text style={styles.title}>Objetivos já salvos</Text>
        <Text style={styles.description}>Seu perfil de aprendizado está pronto para continuar.</Text>
        <View style={styles.summary}>
          {summary.map(([label, value]) => (
            <View key={label} style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{label}</Text>
              <Text style={styles.summaryValue}>{value}</Text>
            </View>
          ))}
        </View>
        <FeedbackMessage>{actionError}</FeedbackMessage>
        <View style={styles.footer}>
          <PrimaryButton title="Voltar" variant="secondary" disabled={working || busy} onPress={back} style={undefined} />
          <PrimaryButton title="Usar estes objetivos" loading={working || busy} onPress={continueWithExisting} style={undefined} />
        </View>
      </View>
    );
  }

  if (invalidQuestion) {
    return (
      <View style={styles.container}>
        <FeedbackMessage>Esta pergunta não está disponível. Volte e tente novamente.</FeedbackMessage>
        <PrimaryButton title="Voltar" variant="secondary" onPress={back} style={undefined} />
      </View>
    );
  }

  const selectedAnswer = draft[current.id];
  const canContinue = isQuestionAnswered(current, draft);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>SEUS OBJETIVOS · {question + 1} DE {GOAL_QUESTIONS.length}</Text>
      <View accessibilityLabel={`Pergunta ${question + 1} de ${GOAL_QUESTIONS.length}`} style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((question + 1) / GOAL_QUESTIONS.length) * 100}%` }]} />
      </View>
      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.description}>{current.description}</Text>

      <View style={styles.options}>
        {current.options.map((option) => {
          const selected = current.type === 'multi'
            ? Array.isArray(selectedAnswer) && selectedAnswer.includes(option.value)
            : selectedAnswer === option.value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityLabel={option.label}
              accessibilityRole={current.type === 'multi' ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: selected, disabled: blocked }}
              disabled={blocked}
              onPress={() => select(option.value)}
              style={({ pressed }) => [
                styles.option,
                selected ? styles.optionSelected : null,
                pressed && !blocked ? styles.optionPressed : null,
              ]}
            >
              <View style={[styles.indicator, selected ? styles.indicatorSelected : null]}>
                {selected ? <Text style={styles.indicatorText}>{current.type === 'multi' ? '✓' : '•'}</Text> : null}
              </View>
              <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FeedbackMessage>{actionError}</FeedbackMessage>
      <View style={styles.footer}>
        <PrimaryButton title="Voltar" variant="secondary" disabled={working || busy} onPress={back} style={undefined} />
        <PrimaryButton
          title={question === GOAL_QUESTIONS.length - 1 ? 'Salvar objetivos' : 'Continuar'}
          disabled={!canContinue || busy}
          loading={working}
          onPress={next}
          style={undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  center: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  stateText: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
  eyebrow: { color: '#B9A5E8', fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 1.1 },
  progressTrack: { height: 4, borderRadius: radii.round, backgroundColor: colors.border, marginBottom: spacing.md },
  progressFill: { height: 4, borderRadius: radii.round, backgroundColor: colors.primary },
  title: { color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '700', letterSpacing: -0.25 },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  options: { gap: spacing.sm, marginTop: spacing.md },
  option: {
    minHeight: controls.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#201832' },
  optionPressed: { backgroundColor: colors.surfacePressed },
  indicator: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: colors.textMuted,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  indicatorText: { color: colors.white, fontSize: 16, lineHeight: 19, fontWeight: '800' },
  optionText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  optionTextSelected: { color: colors.text },
  footer: { gap: spacing.md, marginTop: spacing.lg },
  summary: { backgroundColor: colors.surfaceSubtle, borderRadius: radii.lg, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  summaryRow: { minHeight: controls.minTouch, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryLabel: { width: 104, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  summaryValue: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
});

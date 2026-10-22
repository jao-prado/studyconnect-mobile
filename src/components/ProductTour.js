import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from './BrandMark';
import { PrimaryButton } from './PrimaryButton';
import { colors } from '../theme/colors';
import { controls, radii, spacing, type } from '../theme/tokens';

const STEPS = [
  {
    number: '01',
    label: 'Descoberta',
    title: 'Explore trilhas organizadas',
    description: 'Encontre conteúdos reunidos por tema e escolha com clareza o que você quer aprender.',
    detail: 'Você também pode entrar em uma trilha privada usando um código de acesso.',
  },
  {
    number: '02',
    label: 'Aprendizado',
    title: 'Estude no seu ritmo',
    description: 'Avance aula por aula, retome de onde parou e tire dúvidas durante o percurso.',
    detail: 'Seu progresso fica salvo para você continuar quando for melhor.',
  },
  {
    number: '03',
    label: 'Consistência',
    title: 'Acompanhe sua evolução',
    description: 'Visualize o andamento das trilhas e use o StudyMode para criar uma rotina de foco.',
    detail: 'Informações simples ajudam você a decidir o próximo passo.',
  },
];

export function ProductTour({
  visible,
  onClose,
  onCreateAccount,
  onComplete,
  onStepChange,
  initialStep = 0,
  completionTitle,
}) {
  const [step, setStep] = useState(() => Math.max(0, Math.min(initialStep, STEPS.length - 1)));
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function selectStep(nextStep) {
    setStep(nextStep);
    onStepChange?.(nextStep);
  }

  function closeTour() {
    onClose?.();
  }

  function completeTour() {
    setStep(0);
    if (onComplete) onComplete();
    else onClose?.();
  }

  function createAccount() {
    completeTour();
    if (onComplete) return;
    else onCreateAccount?.();
  }

  return (
    <Modal animationType="fade" onRequestClose={closeTour} statusBarTranslucent visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <BrandMark compact />
          <Pressable
            accessibilityLabel="Fechar tutorial"
            accessibilityRole="button"
            onPress={completeTour}
            style={({ pressed }) => [styles.skipButton, pressed ? styles.skipPressed : null]}
          >
            <Text style={styles.skipText}>Pular</Text>
          </Pressable>
        </View>

        <View accessibilityLabel={`Etapa ${step + 1} de ${STEPS.length}`} style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.stepVisual}>
            <Text style={styles.stepNumber}>{current.number}</Text>
            <View style={styles.pathLine} />
            <View style={styles.pathEnd} />
          </View>

          <View style={styles.copy}>
            <Text style={styles.eyebrow}>{current.label}</Text>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.description}>{current.description}</Text>
            <View style={styles.detail}>
              <View style={styles.detailIndicator} />
              <Text style={styles.detailText}>{current.detail}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {STEPS.map((item, index) => (
              <View key={item.number} style={[styles.dot, index === step ? styles.dotActive : null]} />
            ))}
          </View>
          <View style={styles.actions}>
            {step > 0 ? (
              <PrimaryButton title="Anterior" variant="secondary" onPress={() => selectStep(step - 1)} style={styles.action} />
            ) : null}
            <PrimaryButton
              title={isLast ? (completionTitle || 'Criar minha conta') : 'Próximo'}
              onPress={isLast ? createAccount : () => selectStep(step + 1)}
              style={styles.action}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  topBar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  skipButton: {
    minWidth: 64,
    minHeight: controls.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    marginRight: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  skipPressed: { backgroundColor: colors.surface },
  skipText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  progressTrack: { height: 2, backgroundColor: colors.border },
  progressFill: { height: 2, backgroundColor: colors.primary },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: controls.contentMaxWidth,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
  },
  stepVisual: {
    width: 108,
    height: 108,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stepNumber: { color: colors.primaryText, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -1 },
  pathLine: { width: 48, height: 3, borderRadius: 2, backgroundColor: colors.primary, marginTop: spacing.md },
  pathEnd: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primaryText, marginTop: spacing.sm },
  copy: { marginTop: spacing.xxl },
  eyebrow: { color: '#B9A5E8', ...type.eyebrow },
  title: { color: colors.text, fontSize: 25, lineHeight: 32, fontWeight: '700', letterSpacing: -0.3, marginTop: spacing.sm },
  description: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  detail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  detailIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
  detailText: { flex: 1, color: colors.textSecondary, ...type.body },
  footer: {
    width: '100%',
    maxWidth: controls.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotActive: { width: 22, backgroundColor: colors.primary },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});

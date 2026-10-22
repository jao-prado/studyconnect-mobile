import { useMemo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStudyMode } from '../../../context/StudyModeContext';
import { colors } from '../../../theme/colors';
import { formatClock, localDateKey } from '../../../utils/studyModeUtils';
import { aggregateStudyDays, calculateGoalProgress, calculateStreaks } from '../../../utils/studyAnalytics';

const PHASE_LABELS = { focus: 'Foco', shortBreak: 'Descanso', longBreak: 'Descanso longo' };

function formatStudiedTime(seconds) {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;
}

export default function StudyModeScreen() {
  const studyMode = useStudyMode();
  const { isReady, session, history, todaySeconds, dailyGoalMinutes, currentLocalDate } = studyMode;
  const progress = session.durationSeconds > 0
    ? Math.min(1, Math.max(0, (session.durationSeconds - session.remainingSeconds) / session.durationSeconds))
    : 0;
  const todaySessions = useMemo(() => aggregateStudyDays(history)[localDateKey(currentLocalDate)]?.sessions || 0, [currentLocalDate, history]);
  const streaks = useMemo(() => calculateStreaks(history, currentLocalDate), [currentLocalDate, history]);
  const dailyGoal = useMemo(() => calculateGoalProgress(todaySeconds, dailyGoalMinutes), [dailyGoalMinutes, todaySeconds]);

  if (Platform.OS !== 'android') return <Redirect href="/home" />;

  function confirmCancel() {
    Alert.alert('Encerrar sessão?', 'O progresso desta sessão não será contabilizado.', [
      { text: 'Continuar estudando', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: studyMode.cancel },
    ]);
  }

  if (!isReady) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><View style={styles.loading}><Text style={styles.muted}>Carregando StudyMode…</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>ÁREA DE ESTUDO</Text><Text style={styles.title}>StudyMode</Text></View>
          <Pressable accessibilityLabel="Abrir configurações do StudyMode" accessibilityRole="button" onPress={() => router.push('/study-settings')} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
            <Ionicons color={colors.text} name="settings-outline" size={20} />
          </Pressable>
        </View>

        <View style={styles.timerCard}>
          <View style={styles.timerHighlight}>
            <View style={styles.phaseBadge}><View style={styles.phaseDot} /><Text style={styles.phaseText}>{PHASE_LABELS[session.phase]}</Text></View>
            <Text accessibilityLabel={`${PHASE_LABELS[session.phase]}, ${formatClock(session.remainingSeconds)}`} adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.timer}>{formatClock(session.remainingSeconds)}</Text>
            <Text style={styles.statusText}>
              {session.status === 'paused' ? 'Sessão pausada' : session.status === 'completed' ? 'Fase concluída' : session.status === 'running' ? 'Mantenha o foco' : 'Pronto quando você estiver'}
            </Text>
          </View>
          <View accessibilityLabel={`${Math.round(progress * 100)}% concluído`} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          {session.status === 'idle' && <ActionButton label="Iniciar" onPress={studyMode.start} />}
          {session.status === 'running' && <View style={styles.buttonRow}><ActionButton label="Pausar" onPress={studyMode.pause} /><ActionButton label="Encerrar" onPress={confirmCancel} secondary /></View>}
          {session.status === 'paused' && <View style={styles.buttonRow}><ActionButton label="Continuar" onPress={studyMode.resume} /><ActionButton label="Encerrar" onPress={confirmCancel} secondary /></View>}
          {session.status === 'completed' && <ActionButton label={session.phase === 'focus' ? 'Preparar descanso' : 'Preparar foco'} onPress={studyMode.continueToNextPhase} />}
        </View>

        <View style={styles.summaryCard}>
          <View><Text style={styles.summaryLabel}>ESTUDADO HOJE</Text><Text style={styles.summaryValue}>{formatStudiedTime(todaySeconds)}</Text></View>
          <View style={styles.summaryDivider} />
          <View><Text style={styles.summaryLabel}>SESSÕES</Text><Text style={styles.summaryValue}>{todaySessions}</Text></View>
        </View>
        <Pressable accessibilityHint="Abre calendário e estatísticas de estudo" accessibilityRole="button" onPress={() => router.push('/study-insights')} style={({ pressed }) => [styles.insightsCard, pressed && styles.pressed]}>
          <View style={styles.insightMetric}><Text style={styles.insightValue}>{streaks.current}</Text><Text style={styles.insightLabel}>dias em sequência</Text></View>
          <View style={styles.insightMetric}><Text style={styles.insightValue}>{dailyGoal.percentage}%</Text><Text style={styles.insightLabel}>{dailyGoal.reached ? 'meta alcançada' : `meta de ${dailyGoal.goalMinutes} min`}</Text></View>
          <Text style={styles.insightArrow}>›</Text>
        </Pressable>
        <Text style={styles.footnote}>Após quatro sessões de foco, o próximo descanso será longo. Cada fase só começa quando você confirmar.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ label, onPress, secondary = false }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [secondary ? styles.secondaryButton : styles.primaryButton, styles.flexButton, pressed && styles.pressed]}>
      <Text style={secondary ? styles.secondaryButtonText : styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#B9A5E8', fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 27, lineHeight: 34, fontWeight: '700', marginTop: 2 },
  settingsButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center' },
  timerCard: { marginTop: 20, backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 22, alignItems: 'center' },
  timerHighlight: { width: '100%', alignItems: 'center' },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  phaseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#A78BFA' },
  phaseText: { color: '#DDD6FE', fontSize: 13, fontWeight: '800' },
  timer: { color: colors.text, fontSize: 64, lineHeight: 75, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: -2, marginTop: 17 },
  statusText: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  progressTrack: { width: '100%', height: 5, borderRadius: 3, backgroundColor: colors.surfaceRaised, overflow: 'hidden', marginTop: 23, marginBottom: 20 },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#8B5CF6' },
  buttonRow: { width: '100%', flexDirection: 'row', gap: 10 },
  flexButton: { flex: 1 },
  primaryButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 16, marginTop: 13 },
  summaryLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  summaryValue: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 5 },
  summaryDivider: { width: 1, height: 38, backgroundColor: colors.border, marginHorizontal: 22 },
  insightsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 15, marginTop: 10 },
  insightMetric: { flex: 1 },
  insightValue: { color: colors.primaryText, fontSize: 18, fontWeight: '700' },
  insightLabel: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  insightArrow: { color: '#B9A5E8', fontSize: 25, marginLeft: 8 },
  footnote: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 14, paddingHorizontal: 8 },
  pressed: { opacity: 0.72 },
});

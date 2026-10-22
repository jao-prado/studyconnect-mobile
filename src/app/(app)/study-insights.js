import { useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DailyGoalModal } from '../../components/DailyGoalModal';
import { StudyCalendar } from '../../components/StudyCalendar';
import { WeeklyStudyChart } from '../../components/WeeklyStudyChart';
import { useStudyMode } from '../../context/StudyModeContext';
import { colors } from '../../theme/colors';
import { aggregateStudyDays, calculateGoalProgress, calculateStreaks, calculateStudyStatistics } from '../../utils/studyAnalytics';
import { localDateKey } from '../../utils/studyModeUtils';

function formatMinutes(seconds) {
  return `${Math.floor(seconds / 60)} min`;
}

export default function StudyInsightsScreen() {
  const { history, dailyGoalMinutes, todaySeconds, updateDailyGoal, isReady, currentLocalDate } = useStudyMode();
  const now = currentLocalDate;
  const [visibleMonth, setVisibleMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDateKey, setSelectedDateKey] = useState(localDateKey(now));
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  const days = useMemo(() => aggregateStudyDays(history), [history]);
  const streaks = useMemo(() => calculateStreaks(history, currentLocalDate), [currentLocalDate, history]);
  const statistics = useMemo(() => calculateStudyStatistics(history, currentLocalDate), [currentLocalDate, history]);
  const goal = useMemo(() => calculateGoalProgress(todaySeconds, dailyGoalMinutes), [dailyGoalMinutes, todaySeconds]);
  const selected = days[selectedDateKey] || { seconds: 0, sessions: 0 };

  if (Platform.OS !== 'android') return <Redirect href="/home" />;
  if (!isReady) return <SafeAreaView style={styles.safeArea}><View style={styles.loading}><Text style={styles.muted}>Carregando dados…</Text></View></SafeAreaView>;

  function changeMonth(amount) {
    const date = new Date(visibleMonth.year, visibleMonth.month + amount, 1, 12);
    setVisibleMonth({ year: date.getFullYear(), month: date.getMonth() });
    setSelectedDateKey(null);
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.backButton}><Ionicons color={colors.text} name="chevron-back" size={22} /></Pressable>
          <View style={styles.headerText}><Text style={styles.eyebrow}>STUDYMODE</Text><Text style={styles.title}>Seu progresso</Text></View>
        </View>

        <View style={styles.streakRow}>
          <View style={styles.streakCard}><Ionicons color="#B9A5E8" name="flame-outline" size={16} /><Text style={styles.streakValue}>{streaks.current}</Text><Text style={styles.streakLabel}>sequência atual</Text></View>
          <View style={styles.streakCard}><Ionicons color="#B9A5E8" name="trophy-outline" size={16} /><Text style={styles.streakValue}>{streaks.longest}</Text><Text style={styles.streakLabel}>maior sequência</Text></View>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Seu histórico começa aqui</Text><Text style={styles.emptyText}>Conclua uma sessão de foco para preencher o calendário e as estatísticas.</Text></View>
        ) : null}

        <SectionTitle title="Meta diária" />
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View><Text style={styles.goalValue}>{goal.studiedMinutes} <Text style={styles.goalOf}>de {goal.goalMinutes} min</Text></Text><Text style={styles.goalStatus}>{goal.reached ? 'Meta alcançada' : 'Tempo de foco concluído hoje'}</Text></View>
            <Pressable onPress={() => setGoalModalVisible(true)} style={styles.editButton}><Text style={styles.editText}>Editar</Text></Pressable>
          </View>
          <View accessibilityLabel={`${goal.percentage}% da meta diária`} accessibilityRole="progressbar" style={styles.progressTrack}><View style={[styles.progressFill, { width: `${goal.visualProgress * 100}%` }]} /></View>
          <Text style={styles.percentage}>{goal.percentage}%</Text>
        </View>

        <SectionTitle title="Calendário" />
        <StudyCalendar
          history={history}
          month={visibleMonth.month}
          onNextMonth={() => changeMonth(1)}
          onPreviousMonth={() => changeMonth(-1)}
          onSelectDate={setSelectedDateKey}
          selectedDateKey={selectedDateKey}
          year={visibleMonth.year}
        />
        <View style={styles.selectedSummary}>
          <Text style={styles.selectedDate}>{selectedDateKey ? selectedDateKey.split('-').reverse().join('/') : 'Selecione um dia'}</Text>
          <Text style={styles.selectedResult}>{formatMinutes(selected.seconds)} · {selected.sessions} {selected.sessions === 1 ? 'sessão' : 'sessões'}</Text>
        </View>

        <SectionTitle title="Estatísticas" />
        <View style={styles.statsGrid}>
          <StatCard label="Total estudado" value={formatMinutes(statistics.totalSeconds)} />
          <StatCard label="Sessões concluídas" value={String(statistics.totalSessions)} />
          <StatCard label="Últimos 7 dias" value={formatMinutes(statistics.last7DaysSeconds)} />
          <StatCard label="Mês atual" value={formatMinutes(statistics.monthSeconds)} />
          <StatCard label="Média diária (7d)" value={formatMinutes(statistics.averageDailyLast7Seconds)} />
          <StatCard label="Maior sequência" value={`${statistics.longestStreak} dias`} />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Últimos 7 dias</Text>
          <Text style={styles.chartSubtitle}>Minutos de foco concluídos por dia</Text>
          <WeeklyStudyChart days={statistics.weekly} />
        </View>
      </ScrollView>
      {goalModalVisible ? <DailyGoalModal currentGoal={dailyGoalMinutes} onClose={() => setGoalModalVisible(false)} onSave={updateDailyGoal} /> : null}
    </SafeAreaView>
  );
}

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function StatCard({ label, value }) {
  return <View style={styles.statCard}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border },
  headerText: { marginLeft: 14 },
  eyebrow: { color: '#B9A5E8', fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 2 },
  streakRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  streakCard: { flex: 1, backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 15 },
  streakValue: { color: colors.text, fontSize: 27, fontWeight: '700', marginTop: 8 },
  streakLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  emptyCard: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, marginTop: 12 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  emptyText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 23, marginBottom: 10 },
  goalCard: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 15 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  goalOf: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  goalStatus: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  editButton: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10 },
  editText: { color: '#C4B5FD', fontSize: 12, fontWeight: '800' },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceRaised, overflow: 'hidden', marginTop: 20 },
  progressFill: { height: '100%', backgroundColor: '#8B5CF6', borderRadius: 4 },
  percentage: { color: colors.textMuted, fontSize: 11, textAlign: 'right', marginTop: 6 },
  selectedSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginTop: 11 },
  selectedDate: { color: colors.textMuted, fontSize: 12 },
  selectedResult: { color: colors.text, fontSize: 13, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 82, justifyContent: 'space-between', backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 13 },
  statLabel: { color: colors.textMuted, fontSize: 11, lineHeight: 15 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 8 },
  chartCard: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 15, marginTop: 10 },
  chartTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  chartSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
});

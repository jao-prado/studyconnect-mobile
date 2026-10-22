import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../../../components/BrandMark';
import { useAuth } from '../../../context/AuthContext';
import { useProgresso } from '../../../context/ProgressoContext';
import { useStudyMode } from '../../../context/StudyModeContext';
import { useTrilhas } from '../../../context/TrilhasContext';
import { getProfilePhoto } from '../../../services/profilePhotoStorage';
import { aggregateStudyDays } from '../../../utils/studyAnalytics';
import { localDateKey } from '../../../utils/studyModeUtils';
import { colors } from '../../../theme/colors';
import { controls, radii, spacing, type } from '../../../theme/tokens';

function firstNameOf(name) {
  return name?.trim().split(/\s+/)[0] || 'estudante';
}

function greetingFor(date) {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function profilePhotoUrl(value) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function trailRoute(trilha) {
  router.push({ pathname: '/trilhas/[id]', params: { id: String(trilha.id) } });
}

function ProfileButton({ firstName, photoUrl, localPhotoUri }) {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState(null);
  const safePhotoUrl = localPhotoUri || profilePhotoUrl(photoUrl);
  const showPhoto = safePhotoUrl && failedPhotoUrl !== safePhotoUrl;

  return (
    <Pressable
      accessibilityHint="Abre seu perfil e configurações"
      accessibilityLabel={`Abrir perfil de ${firstName}`}
      accessibilityRole="button"
      onPress={() => router.push('/perfil')}
      style={({ pressed }) => [styles.profileButton, pressed ? styles.pressed : null]}
    >
      {showPhoto ? (
        <Image
          accessible={false}
          fadeDuration={0}
          onError={() => setFailedPhotoUrl(safePhotoUrl)}
          resizeMode="cover"
          source={{ uri: safePhotoUrl }}
          style={styles.profilePhoto}
        />
      ) : (
        <Text style={styles.profileInitial}>{firstName.charAt(0).toUpperCase()}</Text>
      )}
    </Pressable>
  );
}

function TrailProgress({ percentual, compact = false }) {
  const safePercent = Math.max(0, Math.min(100, Number(percentual) || 0));
  return (
    <View style={styles.progress}>
      <View style={styles.progressLabels}>
        <Text style={styles.progressLabel}>Progresso</Text>
        <Text style={styles.progressPercent}>{safePercent}%</Text>
      </View>
      <View
        accessibilityLabel={`Progresso da trilha: ${safePercent}%`}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: safePercent }}
        style={[styles.progressTrack, compact ? styles.progressTrackCompact : null]}
      >
        <View style={[styles.progressFill, { width: `${safePercent}%` }]} />
      </View>
    </View>
  );
}

function ContinueCard({ trilha, progresso }) {
  const hasProgress = Number.isFinite(Number(progresso?.percentual));
  return (
    <View style={styles.continueCard}>
      <View style={styles.continueEyebrow}>
        <Ionicons color={colors.primaryText} name="book-outline" size={16} />
        <Text style={styles.continueEyebrowText}>
          {Number(progresso?.percentual) > 0 ? 'EM ANDAMENTO' : 'PRÓXIMO PASSO'}
        </Text>
      </View>
      {trilha.disciplina ? (
        <Text numberOfLines={1} style={styles.subject}>{trilha.disciplina}</Text>
      ) : null}
      <Text numberOfLines={2} style={styles.continueTitle}>{trilha.nome || 'Trilha de estudos'}</Text>
      {hasProgress ? (
        <TrailProgress percentual={progresso.percentual} />
      ) : (
        <Text style={styles.progressUnavailable}>O progresso será exibido quando estiver disponível.</Text>
      )}
      <Pressable
        accessibilityHint="Abre as aulas desta trilha"
        accessibilityRole="button"
        onPress={() => trailRoute(trilha)}
        style={({ pressed }) => [styles.continueButton, pressed ? styles.pressed : null]}
      >
        <Text style={styles.continueButtonText}>
          {Number(progresso?.percentual) > 0 ? 'Continuar estudando' : 'Começar a estudar'}
        </Text>
        <Ionicons color={colors.white} name="arrow-forward" size={18} />
      </Pressable>
    </View>
  );
}

function TrailRow({ trilha, progresso }) {
  const hasProgress = Number.isFinite(Number(progresso?.percentual));
  return (
    <Pressable
      accessibilityHint="Abre os detalhes e as aulas da trilha"
      accessibilityRole="button"
      onPress={() => trailRoute(trilha)}
      style={({ pressed }) => [styles.trailRow, pressed ? styles.trailRowPressed : null]}
    >
      <View style={styles.trailRowCopy}>
        {trilha.disciplina ? <Text numberOfLines={1} style={styles.trailSubject}>{trilha.disciplina}</Text> : null}
        <Text numberOfLines={1} style={styles.trailTitle}>{trilha.nome || 'Trilha de estudos'}</Text>
        {hasProgress ? <TrailProgress compact percentual={progresso.percentual} /> : null}
      </View>
      <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
    </Pressable>
  );
}

function EmptyTrails() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons color={colors.primaryText} name="book-outline" size={23} />
      </View>
      <Text style={styles.emptyTitle}>Toda jornada começa com uma trilha.</Text>
      <Text style={styles.emptyMessage}>Explore os conteúdos disponíveis e encontre algo que desperte sua curiosidade.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/explorar')}
        style={({ pressed }) => [styles.emptyButton, pressed ? styles.pressed : null]}
      >
        <Text style={styles.emptyButtonText}>Explorar trilhas</Text>
        <Ionicons color={colors.white} name="arrow-forward" size={17} />
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const [initialLoadFinished, setInitialLoadFinished] = useState(false);
  const [storedProfilePhoto, setStoredProfilePhoto] = useState({ userId: null, uri: null });
  const { user } = useAuth();
  const {
    minhasTrilhas,
    loading: trailsLoading,
    error: trailsError,
    ensureLoaded,
    refresh,
  } = useTrilhas();
  const { porTrilha, loadProgressoTrilha } = useProgresso();
  const { currentLocalDate, history, isReady: studyModeReady, settings, todaySeconds } = useStudyMode();
  const localPhotoUri = String(storedProfilePhoto.userId) === String(user?.id)
    ? storedProfilePhoto.uri
    : user?.fotoLocalUri || null;

  useEffect(() => {
    let active = true;
    if (!user?.id) return () => { active = false; };

    void getProfilePhoto(user.id)
      .then((uri) => {
        if (active) setStoredProfilePhoto({ userId: user.id, uri: uri || user.fotoLocalUri || null });
      })
      .catch((photoError) => {
        console.warn('Não foi possível carregar a foto de perfil salva neste dispositivo.', photoError);
      });

    return () => { active = false; };
  }, [user?.fotoLocalUri, user?.id]);

  useEffect(() => {
    let active = true;
    void ensureLoaded()
      .catch(() => {})
      .finally(() => {
        if (active) setInitialLoadFinished(true);
      });
    return () => {
      active = false;
    };
  }, [ensureLoaded]);

  useEffect(() => {
    if (!initialLoadFinished || trailsLoading || minhasTrilhas.length === 0) return;
    void Promise.all(minhasTrilhas.map((trilha) => loadProgressoTrilha(trilha.id).catch(() => null)));
  }, [initialLoadFinished, loadProgressoTrilha, minhasTrilhas, trailsLoading]);

  const todaySessions = useMemo(() => {
    const today = localDateKey(currentLocalDate);
    return aggregateStudyDays(history)[today]?.sessions || 0;
  }, [currentLocalDate, history]);

  const nextTrail = useMemo(() => {
    const notCompleted = minhasTrilhas.filter((trilha) => {
      const progresso = porTrilha[String(trilha.id)];
      return !progresso || Number(progresso.percentual) < 100;
    });
    const inProgress = notCompleted
      .filter((trilha) => Number(porTrilha[String(trilha.id)]?.percentual) > 0)
      .sort((a, b) => (
        Number(porTrilha[String(b.id)]?.percentual) - Number(porTrilha[String(a.id)]?.percentual)
      ));
    return inProgress[0]
      || notCompleted[0]
      || null;
  }, [minhasTrilhas, porTrilha]);

  const otherTrails = useMemo(
    () => minhasTrilhas.filter((trilha) => (
      Number(trilha.id) !== Number(nextTrail?.id)
      && (
        !porTrilha[String(trilha.id)]
        || Number(porTrilha[String(trilha.id)].percentual) < 100
      )
    )),
    [minhasTrilhas, nextTrail, porTrilha],
  );

  const firstName = firstNameOf(user?.nome);
  const dayGreeting = greetingFor(currentLocalDate);
  const todayMinutes = Math.floor(todaySeconds / 60);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => refresh().catch(() => {})}
            refreshing={trailsLoading}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BrandMark compact />
          <ProfileButton firstName={firstName} localPhotoUri={localPhotoUri} photoUrl={user?.fotoUrl} />
        </View>

        <View style={styles.greeting}>
          <Text style={styles.greetingText}>{dayGreeting}, {firstName}</Text>
          <Text accessibilityRole="header" style={styles.heading}>Seu próximo passo começa aqui.</Text>
        </View>

        <View accessibilityLabel="Resumo de foco de hoje" style={styles.activity}>
          <View style={styles.activityHeading}>
            <Text accessibilityRole="header" style={styles.activityTitle}>Hoje nos estudos</Text>
            <Ionicons color={colors.primaryText} name="sunny-outline" size={18} />
          </View>
          <View style={styles.activityStats}>
            <View style={styles.activityMetric}>
              <View style={styles.metricValueRow}>
                <Text style={styles.activityValue}>{studyModeReady ? todayMinutes : '—'}</Text>
                {studyModeReady ? <Text style={styles.metricUnit}>min</Text> : null}
              </View>
              <Text style={styles.activityLabel}>Tempo de foco</Text>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityMetric}>
              <Text style={styles.activityValue}>
                {studyModeReady ? todaySessions : '—'}
              </Text>
              <Text style={styles.activityLabel}>Sessões concluídas</Text>
            </View>
          </View>
        </View>

        {(!initialLoadFinished || trailsLoading) && minhasTrilhas.length === 0 ? (
          <View style={styles.stateRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.stateText}>Carregando suas trilhas…</Text>
          </View>
        ) : trailsError && minhasTrilhas.length === 0 ? (
          <View style={styles.loadError}>
            <Text style={styles.loadErrorText}>{trailsError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => refresh().catch(() => {})}
              style={({ pressed }) => [styles.retryButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : minhasTrilhas.length === 0 ? (
          <EmptyTrails />
        ) : (
          <>
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>Continue de onde parou</Text>
              {nextTrail ? (
                <ContinueCard trilha={nextTrail} progresso={porTrilha[String(nextTrail.id)]} />
              ) : (
                <View style={styles.completedState}>
                  <Ionicons color={colors.success} name="checkmark-circle-outline" size={22} />
                  <Text style={styles.completedText}>Você concluiu todas as suas trilhas atuais.</Text>
                </View>
              )}
            </View>

            {otherTrails.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>Em andamento</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push('/minhas-trilhas')}
                    style={({ pressed }) => [styles.allTrailsButton, pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.allTrailsText}>Ver todas</Text>
                    <Ionicons color={colors.primaryText} name="arrow-forward" size={15} />
                  </Pressable>
                </View>
                <View style={styles.trailList}>
                  {otherTrails.slice(0, 3).map((trilha) => (
                    <TrailRow
                      key={trilha.id}
                      progresso={porTrilha[String(trilha.id)]}
                      trilha={trilha}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}

        <Pressable
          accessibilityHint={`Abre StudyMode. Seu bloco de foco está configurado para ${settings.focusMinutes} minutos.`}
          accessibilityRole="button"
          onPress={() => router.push('/study-mode')}
          style={({ pressed }) => [styles.focusShortcut, pressed ? styles.focusShortcutPressed : null]}
        >
          <View style={styles.focusIcon}>
            <Ionicons color={colors.primaryText} name="hourglass-outline" size={20} />
          </View>
          <View style={styles.focusCopy}>
            <Text style={styles.focusTitle}>Um momento de foco</Text>
            <Text style={styles.focusSubtitle}>StudyMode · {settings.focusMinutes} min</Text>
          </View>
          <Ionicons color={colors.textSecondary} name="chevron-forward" size={20} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: { minHeight: controls.minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileButton: {
    width: controls.minTouch,
    height: controls.minTouch,
    borderRadius: radii.round,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  profilePhoto: { width: '100%', height: '100%' },
  profileInitial: { color: colors.primaryText, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.76 },
  greeting: { gap: spacing.xs, marginTop: spacing.sm },
  greetingText: { color: colors.textSecondary, fontSize: 15, lineHeight: 21, fontWeight: '500' },
  heading: { color: colors.text, ...type.pageHeading },
  activity: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, gap: spacing.md },
  activityHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityTitle: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  activityStats: { flexDirection: 'row', alignItems: 'center' },
  activityMetric: { flex: 1, gap: 2 },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  activityValue: { color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: '700', fontVariant: ['tabular-nums'] },
  metricUnit: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  activityLabel: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  activityDivider: { width: StyleSheet.hairlineWidth, height: 38, backgroundColor: colors.border, marginHorizontal: spacing.lg },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.text, ...type.sectionCompact },
  continueCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, gap: spacing.md },
  continueEyebrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  continueEyebrowText: { color: colors.primaryText, fontSize: 12, lineHeight: 17, fontWeight: '700', letterSpacing: 0.5 },
  subject: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: -spacing.sm },
  continueTitle: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  progress: { gap: spacing.xs },
  progressLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  progressPercent: { color: colors.primaryText, fontSize: 12, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  progressTrack: { height: 6, borderRadius: radii.round, overflow: 'hidden', backgroundColor: colors.surfaceElevated },
  progressTrackCompact: { height: 4 },
  progressFill: { height: '100%', borderRadius: radii.round, backgroundColor: colors.primary },
  progressUnavailable: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  continueButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
  },
  continueButtonText: { color: colors.white, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  sectionHeader: { minHeight: controls.minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  allTrailsButton: { minHeight: controls.minTouch, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingLeft: spacing.sm },
  allTrailsText: { color: colors.primaryText, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  trailList: { gap: spacing.sm },
  trailRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  trailRowPressed: { backgroundColor: colors.surfacePressed },
  trailRowCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  trailSubject: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  trailTitle: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  emptyState: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm },
  emptyIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    marginBottom: spacing.xs,
  },
  emptyTitle: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  emptyMessage: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  emptyButton: { minHeight: 52, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radii.sm, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  emptyButtonText: { color: colors.white, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  completedState: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.successSoft, borderRadius: radii.sm, padding: spacing.md },
  completedText: { flex: 1, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  stateRow: { minHeight: controls.minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  stateText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  loadError: { backgroundColor: colors.surfaceSubtle, borderRadius: radii.md, padding: spacing.lg, gap: spacing.sm },
  loadErrorText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  retryButton: { minHeight: controls.minTouch, justifyContent: 'center' },
  retryText: { color: colors.primaryText, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  focusShortcut: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  focusShortcutPressed: { backgroundColor: colors.surfacePressed },
  focusIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.primarySoft },
  focusCopy: { flex: 1, gap: 2 },
  focusTitle: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  focusSubtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
});

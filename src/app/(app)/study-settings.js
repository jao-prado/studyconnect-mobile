import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StudySettingsModal } from '../../components/StudySettingsModal';
import { useStudyMode } from '../../context/StudyModeContext';
import { openNotificationSettings } from '../../services/notificationService';
import { colors } from '../../theme/colors';

const PERMISSION_LABELS = {
  granted: 'Permitidas pelo Android',
  denied: 'Permissão negada',
  blocked: 'Bloqueadas nas configurações',
  undetermined: 'Ainda não solicitada',
  unknown: 'Não foi possível verificar',
};

export default function StudySettingsScreen() {
  const studyMode = useStudyMode();
  const { settings, session, notificationPreferences, notificationPermission, notificationError } = studyMode;
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [hour, setHour] = useState(String(notificationPreferences.reminderHour).padStart(2, '0'));
  const [minute, setMinute] = useState(String(notificationPreferences.reminderMinute).padStart(2, '0'));
  const [isUpdating, setIsUpdating] = useState(false);
  const isTimerActive = session.status === 'running' || session.status === 'paused';

  if (Platform.OS !== 'android') return <Redirect href="/home" />;

  function showPermissionDenied(status) {
    const blocked = status === 'blocked';
    Alert.alert(
      'Notificações desativadas',
      blocked ? 'Ative as notificações nas configurações do Android. O Pomodoro continuará funcionando normalmente.' : 'Você pode continuar usando o StudyMode sem notificações.',
      blocked
        ? [{ text: 'Agora não', style: 'cancel' }, { text: 'Abrir configurações', onPress: () => void openNotificationSettings() }]
        : [{ text: 'Entendi' }],
    );
  }

  function confirmEnable(kind) {
    const isPomodoro = kind === 'pomodoro';
    Alert.alert(
      isPomodoro ? 'Ativar avisos do Pomodoro?' : 'Ativar lembrete diário?',
      isPomodoro
        ? 'O Android poderá avisar quando uma fase terminar, inclusive com o aplicativo em segundo plano.'
        : `O Android poderá lembrar você de estudar todos os dias às ${hour}:${minute}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            setIsUpdating(true);
            const status = isPomodoro
              ? await studyMode.enablePomodoroNotifications(true)
              : await studyMode.enableDailyReminder(true);
            setIsUpdating(false);
            if (status !== 'granted') showPermissionDenied(status);
          },
        },
      ],
    );
  }

  function togglePomodoro(enabled) {
    if (enabled) confirmEnable('pomodoro');
    else void studyMode.enablePomodoroNotifications(false);
  }

  function toggleReminder(enabled) {
    if (enabled) confirmEnable('reminder');
    else void studyMode.enableDailyReminder(false);
  }

  function saveReminderTime() {
    const nextHour = Math.min(23, Math.max(0, Math.round(Number(hour) || 0)));
    const nextMinute = Math.min(59, Math.max(0, Math.round(Number(minute) || 0)));
    setHour(String(nextHour).padStart(2, '0'));
    setMinute(String(nextMinute).padStart(2, '0'));
    studyMode.updateReminderTime(nextHour, nextMinute);
    Alert.alert('Horário atualizado', 'O lembrete diário foi ajustado.');
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.backButton}><Text style={styles.backIcon}>‹</Text></Pressable>
          <View style={styles.headerText}><Text style={styles.eyebrow}>STUDYMODE</Text><Text style={styles.title}>Configurações</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Temporizador</Text>
        <Pressable onPress={() => setTimerModalVisible(true)} style={styles.timerCard}>
          <View><Text style={styles.cardTitle}>Durações do Pomodoro</Text><Text style={styles.cardDescription}>{settings.focusMinutes} min foco · {settings.shortBreakMinutes} min descanso · {settings.longBreakMinutes} min longo</Text></View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Notificações</Text>
        <View style={styles.settingsCard}>
          <SettingSwitch
            disabled={isUpdating}
            description="Avise quando uma fase de foco ou descanso terminar."
            label="Conclusão do Pomodoro"
            onValueChange={togglePomodoro}
            value={notificationPreferences.pomodoroEnabled}
          />
          <View style={styles.divider} />
          <SettingSwitch
            disabled={isUpdating}
            description="Receba um incentivo diário no horário escolhido."
            label="Lembrete diário"
            onValueChange={toggleReminder}
            value={notificationPreferences.dailyReminderEnabled}
          />

          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>Horário do lembrete</Text>
            <View style={styles.timeRow}>
              <TextInput accessibilityLabel="Hora do lembrete" keyboardType="number-pad" maxLength={2} onChangeText={setHour} selectTextOnFocus style={styles.timeInput} value={hour} />
              <Text style={styles.colon}>:</Text>
              <TextInput accessibilityLabel="Minutos do lembrete" keyboardType="number-pad" maxLength={2} onChangeText={setMinute} selectTextOnFocus style={styles.timeInput} value={minute} />
              <Pressable onPress={saveReminderTime} style={styles.saveTimeButton}><Text style={styles.saveTimeText}>Salvar</Text></Pressable>
            </View>
          </View>
        </View>

        <View style={styles.permissionCard}>
          <View style={styles.permissionDot} />
          <View style={styles.permissionText}><Text style={styles.permissionTitle}>Permissão do sistema</Text><Text style={styles.permissionStatus}>{PERMISSION_LABELS[notificationPermission] || PERMISSION_LABELS.unknown}</Text></View>
          {(notificationPermission === 'blocked' || notificationPermission === 'denied') ? (
            <Pressable onPress={() => void openNotificationSettings()} style={styles.openButton}><Text style={styles.openText}>Abrir</Text></Pressable>
          ) : null}
        </View>
        {notificationError ? <Text accessibilityRole="alert" style={styles.errorText}>{notificationError}</Text> : null}
        <Text style={styles.note}>O Android pode atrasar avisos por economia de bateria. O temporizador continua usando o horário real, mesmo sem permissão.</Text>
      </ScrollView>
      {timerModalVisible ? <StudySettingsModal disabled={isTimerActive} onClose={() => setTimerModalVisible(false)} onSave={studyMode.updateSettings} settings={settings} visible /> : null}
    </SafeAreaView>
  );
}

function SettingSwitch({ label, description, value, onValueChange, disabled }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}><Text style={styles.cardTitle}>{label}</Text><Text style={styles.cardDescription}>{description}</Text></View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onValueChange}
        thumbColor={value ? '#DDD6FE' : '#D4D4D8'}
        trackColor={{ false: colors.surfaceRaised, true: colors.primary }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 22, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  backIcon: { color: colors.text, fontSize: 30, lineHeight: 32 },
  headerText: { marginLeft: 14 },
  eyebrow: { color: '#C4B5FD', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: 27, fontWeight: '800', marginTop: 2 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 28, marginBottom: 11 },
  timerCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 19, padding: 17 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  chevron: { color: '#A78BFA', fontSize: 27, marginLeft: 'auto' },
  settingsCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 17 },
  settingRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingText: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  timeSection: { marginTop: 18, paddingTop: 17, borderTopWidth: 1, borderTopColor: colors.border },
  timeLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  timeInput: { width: 58, minHeight: 48, color: colors.text, textAlign: 'center', fontSize: 17, fontWeight: '800', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  colon: { color: colors.text, fontSize: 20, fontWeight: '800', marginHorizontal: 6 },
  saveTimeButton: { minHeight: 48, justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, marginLeft: 'auto' },
  saveTimeText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  permissionCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111113', borderRadius: 17, padding: 15, marginTop: 12 },
  permissionDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#A78BFA', marginRight: 12 },
  permissionText: { flex: 1 },
  permissionTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  permissionStatus: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  openButton: { minWidth: 54, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  openText: { color: '#C4B5FD', fontSize: 12, fontWeight: '800' },
  errorText: { color: colors.danger, backgroundColor: '#2A1114', borderRadius: 13, padding: 12, fontSize: 12, lineHeight: 18, marginTop: 10 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 14 },
});


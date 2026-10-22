import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme/colors';
import { SETTING_LIMITS } from '../utils/studyModeUtils';

const FIELDS = [
  { key: 'focusMinutes', label: 'Foco' },
  { key: 'shortBreakMinutes', label: 'Descanso' },
  { key: 'longBreakMinutes', label: 'Descanso longo' },
];

export function StudySettingsModal({ visible, settings, disabled, onClose, onSave }) {
  const [draft, setDraft] = useState(settings);

  function save() {
    onSave(draft);
    onClose();
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.backdrop}>
        <Pressable accessibilityLabel="Fechar configurações" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Configurar temporizador</Text>
          <Text style={styles.description}>As alterações valem para as próximas fases.</Text>
          {FIELDS.map(({ key, label }) => (
            <View key={key} style={styles.fieldRow}>
              <View style={styles.fieldText}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.hint}>{SETTING_LIMITS[key].min}–{SETTING_LIMITS[key].max} min</Text>
              </View>
              <TextInput
                accessibilityLabel={`${label} em minutos`}
                editable={!disabled}
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value }))}
                selectTextOnFocus
                style={styles.input}
                value={String(draft[key])}
              />
            </View>
          ))}
          {disabled ? <Text style={styles.warning}>Encerre a sessão atual para alterar as durações.</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondaryButton}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>
            <Pressable disabled={disabled} onPress={save} style={[styles.primaryButton, disabled ? styles.disabled : null]}>
              <Text style={styles.primaryText}>Salvar</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 22 },
  sheet: { backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 22 },
  title: { color: colors.text, fontSize: 21, fontWeight: '800' },
  description: { color: colors.textMuted, fontSize: 14, marginTop: 6, marginBottom: 18 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11 },
  fieldText: { flex: 1 },
  label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  input: { width: 72, color: colors.text, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  warning: { color: '#C4B5FD', fontSize: 12, lineHeight: 17, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  secondaryButton: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 13, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text, fontWeight: '700' },
  primaryButton: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 13, backgroundColor: colors.primary },
  primaryText: { color: colors.white, fontWeight: '800' },
  disabled: { opacity: 0.4 },
});

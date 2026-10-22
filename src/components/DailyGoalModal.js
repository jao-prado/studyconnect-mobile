import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme/colors';
import { DAILY_GOAL_LIMITS, DAILY_GOAL_PRESETS, sanitizeDailyGoal } from '../utils/studyAnalytics';

export function DailyGoalModal({ currentGoal, onClose, onSave }) {
  const [value, setValue] = useState(String(currentGoal));

  function save() {
    onSave(sanitizeDailyGoal(value));
    onClose();
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.backdrop}>
        <Pressable accessibilityLabel="Fechar meta diária" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <Text style={styles.title}>Meta diária</Text>
          <Text style={styles.description}>Defina quantos minutos de foco deseja concluir por dia.</Text>
          <View style={styles.presets}>
            {DAILY_GOAL_PRESETS.map((minutes) => (
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: Number(value) === minutes }} key={minutes} onPress={() => setValue(String(minutes))} style={[styles.preset, Number(value) === minutes && styles.presetSelected]}>
                <Text style={[styles.presetText, Number(value) === minutes && styles.presetTextSelected]}>{minutes} min</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Valor personalizado</Text>
          <View style={styles.inputRow}>
            <TextInput
              accessibilityLabel="Meta diária personalizada em minutos"
              keyboardType="number-pad"
              maxLength={3}
              onChangeText={setValue}
              selectTextOnFocus
              style={styles.input}
              value={value}
            />
            <Text style={styles.unit}>minutos</Text>
          </View>
          <Text style={styles.hint}>Entre {DAILY_GOAL_LIMITS.min} e {DAILY_GOAL_LIMITS.max} minutos.</Text>
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondaryButton}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>
            <Pressable onPress={save} style={styles.primaryButton}><Text style={styles.primaryText}>Salvar meta</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.74)' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 22 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  preset: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  presetSelected: { borderColor: '#8B5CF6', backgroundColor: colors.primarySoft },
  presetText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  presetTextSelected: { color: '#DDD6FE' },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 22 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9 },
  input: { width: 96, color: colors.text, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 17, fontWeight: '700' },
  unit: { color: colors.textMuted, fontSize: 14 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 7 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  secondaryButton: { flex: 1, alignItems: 'center', paddingVertical: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 13 },
  secondaryText: { color: colors.text, fontWeight: '700' },
  primaryButton: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 13, backgroundColor: colors.primary },
  primaryText: { color: colors.white, fontWeight: '800' },
});


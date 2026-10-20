import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import { colors } from '../theme/colors';

export function PrivateAccessModal({ visible, loading, error, onClose, onSubmit }) {
  const inputRef = useRef(null);
  const [codigo, setCodigo] = useState('');

  function submit() {
    const normalized = codigo.trim().toUpperCase();
    if (normalized) onSubmit(normalized);
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <Text style={styles.eyebrow}>TRILHA PRIVADA</Text>
          <Text style={styles.title}>Código de acesso</Text>
          <Text style={styles.subtitle}>Digite o código compartilhado pelo professor. O acesso já realizará sua matrícula.</Text>
          <TextInput
            ref={inputRef}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            editable={!loading}
            maxLength={20}
            onChangeText={setCodigo}
            onSubmitEditing={submit}
            placeholder="Ex.: ABCD2345EFGH"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            style={styles.input}
            value={codigo}
          />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <PrimaryButton disabled={!codigo.trim()} loading={loading} onPress={submit} title="Validar código" />
          <Pressable accessibilityRole="button" disabled={loading} onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  card: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: colors.border, padding: 24, paddingBottom: 30 },
  eyebrow: { color: '#C4B5FD', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', marginTop: 7 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  input: { minHeight: 54, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 14, color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 16, marginVertical: 20 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: -10, marginBottom: 16 },
  cancel: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  cancelText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
});

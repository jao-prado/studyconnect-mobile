import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { ProgressBar } from './ProgressBar';

function fallback(value, text) {
  return value?.trim() || text;
}

export function TrilhaCard({ trilha, matriculado, onPress, progresso }) {
  const privada = trilha.tipo === 'PRIVADA';

  return (
    <Pressable
      accessibilityHint="Abre os detalhes da trilha"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.topRow}>
        <View style={styles.subjectBadge}>
          <Text numberOfLines={1} style={styles.subjectText}>{fallback(trilha.disciplina, 'Geral')}</Text>
        </View>
        <View style={styles.statusRow}>
          {privada ? <Text style={styles.privateText}>Privada</Text> : null}
          {matriculado ? <Text style={styles.enrolledText}>Matriculado</Text> : null}
        </View>
      </View>

      <Text numberOfLines={2} style={styles.title}>{fallback(trilha.nome, 'Trilha sem nome')}</Text>
      <Text numberOfLines={3} style={styles.description}>{fallback(trilha.descricao, 'Sem descrição disponível.')}</Text>

      {matriculado && progresso ? <ProgressBar compact percentual={progresso.percentual} /> : null}

      <View style={styles.footer}>
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>Nível</Text>
          <Text numberOfLines={1} style={styles.metaValue}>{fallback(trilha.nivel, 'Não informado')}</Text>
        </View>
        <View style={[styles.meta, styles.professor]}>
          <Text style={styles.metaLabel}>Professor</Text>
          <Text numberOfLines={1} style={styles.metaValue}>{fallback(trilha.professorNome, 'Não informado')}</Text>
        </View>
        <Ionicons color="#B9A5E8" name="chevron-forward" size={18} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 15, gap: 9 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  subjectBadge: { maxWidth: '48%', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  subjectText: { color: '#DDD6FE', fontSize: 12, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  privateText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  enrolledText: { color: '#86EFAC', fontSize: 12, fontWeight: '700' },
  title: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 10, gap: 12 },
  meta: { maxWidth: '30%' },
  professor: { flex: 1, maxWidth: 'none' },
  metaLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  metaValue: { color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 2 },
});

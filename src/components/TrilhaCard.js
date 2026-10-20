import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

function fallback(value, text) {
  return value?.trim() || text;
}

export function TrilhaCard({ trilha, matriculado, onPress }) {
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

      <View style={styles.footer}>
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>Nível</Text>
          <Text numberOfLines={1} style={styles.metaValue}>{fallback(trilha.nivel, 'Não informado')}</Text>
        </View>
        <View style={[styles.meta, styles.professor]}>
          <Text style={styles.metaLabel}>Professor</Text>
          <Text numberOfLines={1} style={styles.metaValue}>{fallback(trilha.professorNome, 'Não informado')}</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18, gap: 12 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  subjectBadge: { maxWidth: '48%', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  subjectText: { color: '#DDD6FE', fontSize: 12, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  privateText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  enrolledText: { color: '#86EFAC', fontSize: 12, fontWeight: '700' },
  title: { color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  footer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13, gap: 16 },
  meta: { maxWidth: '30%' },
  professor: { flex: 1, maxWidth: 'none' },
  metaLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 2 },
  arrow: { color: '#C4B5FD', fontSize: 28, lineHeight: 28 },
});

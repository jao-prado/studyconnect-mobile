import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function AulaCard({ aula, index, concluida, onPress }) {
  const hasQuiz = aula.blocos?.some((bloco) => bloco?.tipo === 'questionario');

  return (
    <Pressable
      accessibilityHint="Abre o conteúdo da aula"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, concluida ? styles.cardDone : null, pressed ? styles.pressed : null]}
    >
      <View style={[styles.number, concluida ? styles.numberDone : null]}>
        <Text style={[styles.numberText, concluida ? styles.numberTextDone : null]}>{concluida ? '✓' : index + 1}</Text>
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={2} style={styles.title}>{aula.titulo || `Aula ${index + 1}`}</Text>
        <Text style={[styles.status, concluida ? styles.statusDone : null]}>
          {concluida ? 'Concluída' : hasQuiz ? 'Questionário' : 'Aula'}
        </Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 13 },
  cardDone: { borderColor: '#28543A' },
  pressed: { opacity: 0.74 },
  number: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  numberDone: { backgroundColor: '#123322' },
  numberText: { color: colors.textMuted, fontSize: 14, fontWeight: '800' },
  numberTextDone: { color: '#86EFAC' },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  status: { color: '#B9A5E8', fontSize: 11, fontWeight: '500', marginTop: 3 },
  statusDone: { color: '#86EFAC' },
});

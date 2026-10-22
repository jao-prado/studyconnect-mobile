import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function ProgressBar({ percentual = 0, compact = false }) {
  const safePercent = Math.max(0, Math.min(100, Number(percentual) || 0));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, compact ? styles.compactLabel : null]}>Progresso</Text>
        <Text style={[styles.percent, compact ? styles.compactPercent : null]}>{safePercent}%</Text>
      </View>
      <View accessibilityLabel={`${safePercent}% concluído`} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: safePercent }} style={[styles.track, compact ? styles.compactTrack : null]}>
        <View style={[styles.fill, { width: `${safePercent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  percent: { color: '#C4B5FD', fontSize: 16, fontWeight: '800' },
  track: { height: 8, backgroundColor: colors.surfaceRaised, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 999 },
  compactLabel: { fontSize: 11 },
  compactPercent: { fontSize: 12 },
  compactTrack: { height: 6 },
});

import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function WeeklyStudyChart({ days }) {
  const maxSeconds = Math.max(1, ...days.map((day) => day.seconds));
  return (
    <View accessibilityLabel="Minutos estudados nos últimos sete dias" style={styles.chart}>
      {days.map((day) => {
        const minutes = Math.floor(day.seconds / 60);
        const height = day.seconds > 0 ? Math.max(8, (day.seconds / maxSeconds) * 94) : 3;
        return (
          <View key={day.dateKey} style={styles.column}>
            <Text style={styles.value}>{minutes > 0 ? minutes : '·'}</Text>
            <View style={styles.barTrack}><View style={[styles.bar, { height }]} /></View>
            <Text style={styles.day}>{DAY_LABELS[day.date.getDay()]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { height: 145, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 },
  column: { flex: 1, alignItems: 'center' },
  value: { color: colors.textMuted, fontSize: 10, height: 15 },
  barTrack: { height: 98, width: 18, justifyContent: 'flex-end', backgroundColor: colors.surfaceRaised, borderRadius: 6, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: '#8B5CF6', borderRadius: 6 },
  day: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 7 },
});

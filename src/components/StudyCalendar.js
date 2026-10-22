import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { buildCalendarMonth } from '../utils/studyAnalytics';
import { localDateKey } from '../utils/studyModeUtils';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function StudyCalendar({ year, month, history, selectedDateKey, onSelectDate, onPreviousMonth, onNextMonth }) {
  const cells = buildCalendarMonth(year, month, history);
  const todayKey = localDateKey();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Mês anterior" accessibilityRole="button" onPress={onPreviousMonth} style={styles.arrowButton}><Ionicons color={colors.text} name="chevron-back" size={19} /></Pressable>
        <Text style={styles.month}>{MONTHS[month]} {year}</Text>
        <Pressable accessibilityLabel="Próximo mês" accessibilityRole="button" onPress={onNextMonth} style={styles.arrowButton}><Ionicons color={colors.text} name="chevron-forward" size={19} /></Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((label, index) => <View key={`${label}-${index}`} style={styles.cell}><Text style={styles.weekday}>{label}</Text></View>)}
        {cells.map((cell, index) => (
          <View key={cell?.dateKey || `empty-${index}`} style={styles.cell}>
            {cell ? (
              <Pressable
                accessibilityLabel={`${cell.day}, ${cell.sessions} sessões, ${Math.floor(cell.seconds / 60)} minutos`}
                accessibilityRole="button"
                accessibilityState={{ selected: cell.dateKey === selectedDateKey }}
                onPress={() => onSelectDate(cell.dateKey)}
                style={[
                  styles.day,
                  cell.seconds > 0 && styles.activeDay,
                  cell.dateKey === todayKey && styles.today,
                  cell.dateKey === selectedDateKey && styles.selectedDay,
                ]}
              >
                <Text style={[styles.dayText, cell.seconds > 0 && styles.activeDayText, cell.dateKey === selectedDateKey && styles.selectedDayText]}>{cell.day}</Text>
                {cell.seconds > 0 ? <View style={styles.activityDot} /> : null}
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 13 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  month: { color: colors.text, fontSize: 15, fontWeight: '700' },
  arrowButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.surfaceRaised },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  weekday: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  day: { width: 42, height: 42, maxWidth: '100%', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  activeDay: { backgroundColor: colors.primarySoft },
  today: { borderWidth: 1, borderColor: '#A78BFA' },
  selectedDay: { backgroundColor: colors.primary },
  dayText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  activeDayText: { color: colors.primaryText, fontWeight: '700' },
  selectedDayText: { color: colors.white },
  activityDot: { position: 'absolute', bottom: 3, width: 3, height: 3, borderRadius: 2, backgroundColor: colors.primaryText },
});

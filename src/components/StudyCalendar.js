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
        <Pressable accessibilityLabel="Mês anterior" onPress={onPreviousMonth} style={styles.arrowButton}><Text style={styles.arrow}>‹</Text></Pressable>
        <Text style={styles.month}>{MONTHS[month]} {year}</Text>
        <Pressable accessibilityLabel="Próximo mês" onPress={onNextMonth} style={styles.arrowButton}><Text style={styles.arrow}>›</Text></Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((label, index) => <View key={`${label}-${index}`} style={styles.cell}><Text style={styles.weekday}>{label}</Text></View>)}
        {cells.map((cell, index) => (
          <View key={cell?.dateKey || `empty-${index}`} style={styles.cell}>
            {cell ? (
              <Pressable
                accessibilityLabel={`${cell.day}, ${cell.sessions} sessões, ${Math.floor(cell.seconds / 60)} minutos`}
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
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 15 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  month: { color: colors.text, fontSize: 16, fontWeight: '800' },
  arrowButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.surfaceRaised },
  arrow: { color: colors.text, fontSize: 28, lineHeight: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  weekday: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  day: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activeDay: { backgroundColor: colors.primarySoft },
  today: { borderWidth: 1, borderColor: '#A78BFA' },
  selectedDay: { backgroundColor: colors.primary },
  dayText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  activeDayText: { color: '#DDD6FE', fontWeight: '800' },
  selectedDayText: { color: colors.white },
  activityDot: { position: 'absolute', bottom: 3, width: 3, height: 3, borderRadius: 2, backgroundColor: '#C4B5FD' },
});


import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function ScreenHeader({ eyebrow, title, subtitle, action }) {
  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action || null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  copy: { flex: 1 },
  eyebrow: { color: '#C4B5FD', fontSize: 12, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: 30, lineHeight: 37, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 7 },
});

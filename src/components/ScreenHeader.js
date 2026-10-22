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
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#B9A5E8', fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.25, marginTop: 4 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 5 },
});

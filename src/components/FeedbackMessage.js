import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/tokens';

export function FeedbackMessage({ children, kind = 'error' }) {
  if (!children) return null;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.message, kind === 'success' ? styles.success : styles.error]}
    >
      <View style={[styles.indicator, kind === 'success' ? styles.successIndicator : styles.errorIndicator]} />
      <Text style={[styles.text, kind === 'success' ? styles.successText : styles.errorText]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  error: { backgroundColor: colors.dangerSoft, borderColor: '#5A292F' },
  success: { backgroundColor: colors.successSoft, borderColor: '#245442' },
  indicator: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  errorIndicator: { backgroundColor: colors.danger },
  successIndicator: { backgroundColor: colors.success },
  text: { flex: 1, fontSize: 14, lineHeight: 20 },
  errorText: { color: '#FFC7CB' },
  successText: { color: '#C9F7E2' },
});

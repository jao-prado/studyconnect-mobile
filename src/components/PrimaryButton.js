import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';
import { controls, radii, spacing } from '../theme/tokens';

export function PrimaryButton({ title, loading = false, disabled = false, onPress, variant = 'primary', style }) {
  const blocked = loading || disabled;
  const secondary = variant === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: blocked }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : styles.primary,
        pressed && !blocked ? (secondary ? styles.secondaryPressed : styles.primaryPressed) : null,
        blocked ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.primaryText : colors.white} />
      ) : (
        <Text style={[styles.text, secondary ? styles.secondaryText : styles.primaryText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: controls.buttonHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed, borderColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  secondaryPressed: { backgroundColor: colors.surfacePressed },
  disabled: { opacity: 0.55 },
  text: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  primaryText: { color: colors.white },
  secondaryText: { color: colors.text },
});

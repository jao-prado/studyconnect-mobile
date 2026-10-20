import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';

export function PrimaryButton({ title, loading = false, disabled = false, onPress }) {
  const blocked = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && !blocked ? styles.pressed : null, blocked ? styles.disabled : null]}
    >
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  pressed: { backgroundColor: colors.primaryPressed },
  disabled: { opacity: 0.55 },
  text: { color: colors.white, fontSize: 16, fontWeight: '700' },
});

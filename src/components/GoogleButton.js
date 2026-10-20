import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function GoogleButton({ loading = false, disabled = false, onPress }) {
  const blocked = loading || disabled;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && !blocked ? styles.pressed : null, blocked ? styles.disabled : null]}
    >
      {loading ? (
        <ActivityIndicator color="#1F2937" />
      ) : (
        <View style={styles.content}>
          <Text accessibilityElementsHidden style={styles.icon}>G</Text>
          <Text style={styles.text}>Continuar com Google</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: '#D4D4D8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  pressed: { backgroundColor: '#F4F4F5' },
  disabled: { opacity: 0.55 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  icon: { color: '#4285F4', fontSize: 20, fontWeight: '900' },
  text: { color: '#18181B', fontSize: 16, fontWeight: '700' },
});

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function StateView({ loading, title, message, onRetry }) {
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator color={colors.primary} size="large" /> : <Text style={styles.icon}>◇</Text>}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 60 },
  icon: { color: '#C4B5FD', fontSize: 40, marginBottom: 8 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 14 },
  message: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7 },
  button: { backgroundColor: colors.surfaceRaised, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 12, marginTop: 20 },
  pressed: { opacity: 0.75 },
  buttonText: { color: colors.text, fontSize: 14, fontWeight: '700' },
});

import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { controls, radii, spacing } from '../theme/tokens';

export function GoogleButton({ loading = false, disabled = false, onPress }) {
  const blocked = loading || disabled;

  return (
    <Pressable
      accessibilityLabel="Continuar com Google"
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: blocked }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && !blocked ? styles.pressed : null, blocked ? styles.disabled : null]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryText} />
      ) : (
        <View style={styles.content}>
          <Image
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no"
            source={require('../../assets/google-g.png')}
            resizeMode="contain"
            fadeDuration={0}
            style={styles.icon}
          />
          <Text style={styles.text}>Continuar com Google</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: controls.buttonHeight,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  pressed: { backgroundColor: colors.surfacePressed },
  disabled: { opacity: 0.55 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  icon: { width: 20, height: 20 },
  text: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '600' },
});

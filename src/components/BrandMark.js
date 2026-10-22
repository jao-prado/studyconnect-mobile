import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function BrandMark({ compact = false }) {
  return (
    <View accessibilityLabel="StudyConnect" accessibilityRole="header" style={compact ? styles.compact : styles.brand}>
      {compact ? null : (
        <Image
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
          source={require('../../assets/studyconnect-mark.png')}
          resizeMode="contain"
          fadeDuration={0}
          style={styles.mark}
        />
      )}
      <Text style={compact ? styles.compactName : styles.name}>
        Study<Text style={styles.nameAccent}>Connect+</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: 8 },
  compact: { justifyContent: 'center' },
  mark: { width: 108, height: 82 },
  name: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6 },
  compactName: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '800', letterSpacing: -0.4 },
  nameAccent: { color: colors.primary },
});

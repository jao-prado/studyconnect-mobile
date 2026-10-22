import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from './BrandMark';
import { colors } from '../theme/colors';
import { spacing } from '../theme/tokens';

export function LoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <BrandMark />
        <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
        <Text style={styles.message}>Restaurando sua sessão...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  spinner: { marginTop: spacing.xxxl },
  message: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: spacing.md },
});

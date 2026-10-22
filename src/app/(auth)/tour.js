import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductTour } from '../../components/ProductTour';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/tokens';

export default function SignupTourScreen() {
  const {
    onboardingError,
    onboardingStep,
    updateTourStep,
    completeTour,
    pauseTour,
    retryOnboarding,
    logout,
  } = useAuth();

  const finishTour = useCallback(async () => {
    await completeTour();
    router.replace('/home');
  }, [completeTour]);

  const pausePresentation = useCallback(async () => {
    await pauseTour();
    router.replace('/home');
  }, [pauseTour]);

  if (onboardingError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContent}>
          <Text accessibilityRole="header" style={styles.title}>Não foi possível abrir sua apresentação</Text>
          <Text accessibilityRole="alert" style={styles.message}>{onboardingError}</Text>
          <PrimaryButton title="Tentar novamente" onPress={() => retryOnboarding().catch(() => {})} />
          <Pressable accessibilityRole="button" onPress={() => logout().then(() => router.replace('/boas-vindas'))} style={styles.logout}>
            <Text style={styles.logoutText}>Sair da conta</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ProductTour
      initialStep={onboardingStep}
      onClose={() => pausePresentation().catch(() => {})}
      onComplete={() => finishTour().catch(() => {})}
      onStepChange={(step) => updateTourStep(step).catch(() => {})}
      visible
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl },
  errorContent: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: spacing.lg },
  title: { color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: '700' },
  message: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  logout: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});

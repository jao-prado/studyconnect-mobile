import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '../../components/BrandMark';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { GoogleButton } from '../../components/GoogleButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { requestGoogleIdToken } from '../../services/googleSignInService';
import { colors } from '../../theme/colors';
import { controls, spacing } from '../../theme/tokens';

export default function BoasVindasScreen() {
  const { width } = useWindowDimensions();
  const { signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleGoogleLogin() {
    if (googleLoading) return;
    setGoogleLoading(true);
    setMessage('');
    try {
      const idToken = await requestGoogleIdToken();
      if (!idToken) return;
      const result = await signInWithGoogle(idToken);
      router.replace(result.mfaRequired ? '/mfa' : '/home');
    } catch (error) {
      if (error.code === 'STUDENT_ONLY') setMessage('Este aplicativo é exclusivo para contas de aluno.');
      else if (error.code === 'GOOGLE_MFA_REQUIRED') setMessage(error.message);
      else if (error.status === 401) setMessage('Não foi possível confirmar o acesso com Google. Tente novamente.');
      else if (error.status === 403) setMessage('Esta conta está suspensa ou sem permissão de acesso.');
      else setMessage('Não foi possível entrar com Google. Tente novamente ou use e-mail e senha.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: width < 360 ? spacing.lg : spacing.xl }]} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <BrandMark />
          <View style={styles.hero}>
            <Text style={styles.title}>Aprenda no seu ritmo.</Text>
            <Text style={styles.subtitle}>Explore trilhas gratuitas, acompanhe suas aulas e crie uma rotina de estudos.</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <FeedbackMessage>{message}</FeedbackMessage>
          <PrimaryButton disabled={googleLoading} title="Criar minha conta" onPress={() => router.push('/cadastro')} />
          <PrimaryButton disabled={googleLoading} title="Já tenho conta" variant="secondary" onPress={() => router.push('/login')} />
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou continue com</Text>
            <View style={styles.dividerLine} />
          </View>
          <GoogleButton loading={googleLoading} onPress={handleGoogleLogin} />
          <Text style={styles.footer}>Uma única conta para o Web e Mobile.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: controls.contentMaxWidth,
    alignSelf: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  intro: { alignItems: 'center', paddingTop: spacing.lg },
  hero: { alignItems: 'center', marginTop: spacing.xxxl },
  title: { color: colors.text, fontSize: 27, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 310,
    marginTop: spacing.md,
  },
  actions: { gap: spacing.sm, paddingTop: spacing.xxl },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  footer: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: spacing.sm },
});

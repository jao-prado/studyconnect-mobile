import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AuthScreen, authStyles } from '../../components/AuthScreen';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { FormInput } from '../../components/FormInput';
import { GoogleButton } from '../../components/GoogleButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { requestGoogleIdToken } from '../../services/googleSignInService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/tokens';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    if (loading || googleLoading) return;
    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors = {};
    if (!normalizedEmail) nextErrors.email = 'Informe seu e-mail.';
    else if (!isValidEmail(normalizedEmail)) nextErrors.email = 'Informe um e-mail válido.';
    if (!senha) nextErrors.senha = 'Informe sua senha.';
    setErrors(nextErrors);
    setMessage('');
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const result = await signIn(normalizedEmail, senha);
      setSenha('');
      router.replace(result.mfaRequired ? '/mfa' : '/home');
    } catch (error) {
      if (error.status === 401) setMessage('E-mail ou senha incorretos.');
      else if (error.status === 403 && error.code !== 'STUDENT_ONLY') setMessage('Esta conta está suspensa ou sem permissão de acesso.');
      else setMessage(error.message || 'Não foi possível entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (loading || googleLoading) return;
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
      else if (error.status === 401) setMessage('Não foi possível entrar com Google. Tente novamente ou use e-mail e senha.');
      else if (error.status === 403) setMessage('Esta conta está suspensa ou sem permissão de acesso.');
      else if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') setMessage(error.message);
      else setMessage('Não foi possível entrar com Google. Tente novamente.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthScreen
      eyebrow="Área do aluno"
      title="Entre na sua conta"
      subtitle="Continue seus estudos de onde parou."
    >
      <FormInput
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={errors.email}
        keyboardType="email-address"
        label="E-mail"
        onChangeText={(value) => { setEmail(value); setErrors((current) => ({ ...current, email: null })); setMessage(''); }}
        onSubmitEditing={() => passwordRef.current?.focus()}
        placeholder="seu@email.com"
        returnKeyType="next"
        value={email}
      />
      <FormInput
        ref={passwordRef}
        autoCapitalize="none"
        autoComplete="current-password"
        error={errors.senha}
        label="Senha"
        onChangeText={(value) => { setSenha(value); setErrors((current) => ({ ...current, senha: null })); setMessage(''); }}
        onSubmitEditing={handleLogin}
        placeholder="Digite sua senha"
        returnKeyType="done"
        secureTextEntry
        value={senha}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: loading || googleLoading }}
        disabled={loading || googleLoading}
        onPress={() => router.push('/recuperar-senha')}
        style={styles.forgotButton}
      >
        <Text style={styles.forgot}>Esqueci minha senha</Text>
      </Pressable>
      <FeedbackMessage>{message}</FeedbackMessage>
      <PrimaryButton disabled={googleLoading} loading={loading} onPress={handleLogin} title="Entrar" />
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ou continue com</Text>
        <View style={styles.dividerLine} />
      </View>
      <GoogleButton loading={googleLoading} disabled={loading} onPress={handleGoogleLogin} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: loading || googleLoading }}
        disabled={loading || googleLoading}
        onPress={() => router.push('/cadastro')}
        style={authStyles.linkButton}
      >
        <Text style={authStyles.link}>
          <Text style={authStyles.linkPrefix}>Ainda não tem conta? </Text>
          Criar conta
        </Text>
      </Pressable>
      <Text style={styles.webNote}>A mesma conta de aluno funciona no aplicativo e no StudyConnect Web.</Text>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, paddingVertical: spacing.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  forgotButton: { minHeight: 48, alignSelf: 'flex-end', justifyContent: 'center', marginTop: -spacing.sm },
  forgot: { color: colors.primaryText, fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'right' },
  webNote: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: -spacing.sm },
});

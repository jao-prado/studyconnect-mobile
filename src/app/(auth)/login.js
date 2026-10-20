import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}><Text style={styles.logoText}>S</Text></View>
            <Text style={styles.brandName}>StudyConnect</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>ÁREA DO ALUNO</Text>
            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Entre para continuar seus estudos.</Text>

            <View style={styles.form}>
              <FormInput
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
                keyboardType="email-address"
                label="E-mail"
                onChangeText={(value) => { setEmail(value); setErrors((current) => ({ ...current, email: null })); }}
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
                onChangeText={(value) => { setSenha(value); setErrors((current) => ({ ...current, senha: null })); }}
                onSubmitEditing={handleLogin}
                placeholder="Sua senha"
                returnKeyType="done"
                secureTextEntry
                value={senha}
              />
              <Pressable onPress={() => router.push('/recuperar-senha')}>
                <Text style={styles.forgot}>Esqueci minha senha</Text>
              </Pressable>
              {message ? <Text accessibilityRole="alert" style={styles.message}>{message}</Text> : null}
              <PrimaryButton loading={loading} onPress={handleLogin} title="Entrar" />
              <Pressable onPress={() => router.push('/cadastro')}>
                <Text style={styles.create}>Ainda não tem conta? Cadastre-se</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.footer}>Use a mesma conta de aluno do StudyConnect Web.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 28 },
  brand: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.white, fontSize: 23, fontWeight: '800' },
  brandName: { color: colors.text, fontSize: 24, fontWeight: '800' },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 24 },
  eyebrow: { color: '#C4B5FD', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 29, lineHeight: 35, fontWeight: '800', marginTop: 10 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 7 },
  form: { gap: 18, marginTop: 28 },
  message: { color: colors.danger, backgroundColor: '#3F171B', borderRadius: 12, padding: 12, fontSize: 14, lineHeight: 20 },
  forgot: { color: '#C4B5FD', fontSize: 14, fontWeight: '600', textAlign: 'right', marginTop: -8 },
  create: { color: '#C4B5FD', fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  footer: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AuthScreen, authStyles } from '../../components/AuthScreen';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/tokens';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_RULES = [
  { label: '8 ou mais caracteres', test: (value) => value.length >= 8 },
  { label: 'Uma letra maiúscula', test: (value) => /[A-Z]/.test(value) },
  { label: 'Uma letra minúscula', test: (value) => /[a-z]/.test(value) },
  { label: 'Um número', test: (value) => /\d/.test(value) },
  { label: 'Um símbolo', test: (value) => /[^A-Za-z0-9]/.test(value) },
];

export default function CadastroScreen() {
  const { register } = useAuth();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmationRef = useRef(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmacao: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: null }));
    setMessage('');
  }

  async function handleRegister() {
    if (loading) return;
    const nome = form.nome.trim();
    const email = form.email.trim().toLowerCase();
    const nextErrors = {};
    if (!nome) nextErrors.nome = 'Informe seu nome.';
    else if (nome.length > 45) nextErrors.nome = 'Use no máximo 45 caracteres.';
    if (!email) nextErrors.email = 'Informe seu e-mail.';
    else if (!EMAIL_PATTERN.test(email)) nextErrors.email = 'Informe um e-mail válido.';
    else if (email.length > 45) nextErrors.email = 'Use no máximo 45 caracteres.';
    if (!form.senha) nextErrors.senha = 'Informe uma senha.';
    else if (!PASSWORD_PATTERN.test(form.senha)) nextErrors.senha = 'Use 8 caracteres, com maiúscula, minúscula, número e símbolo.';
    if (!form.confirmacao) nextErrors.confirmacao = 'Confirme sua senha.';
    else if (form.confirmacao !== form.senha) nextErrors.confirmacao = 'As senhas não coincidem.';
    setErrors(nextErrors);
    setMessage('');
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await register(nome, email, form.senha);
      setForm((current) => ({ ...current, senha: '', confirmacao: '' }));
      router.replace({ pathname: '/verificar-email', params: { email } });
    } catch (error) {
      if (error.status === 409) setMessage('Este e-mail já está cadastrado.');
      else setMessage(error.message || 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen eyebrow="Conta de estudante" title="Crie sua conta" subtitle="Comece sua jornada no StudyConnect.">
      <FormInput label="Nome" autoCapitalize="words" autoComplete="name" maxLength={45} placeholder="Como podemos chamar você?" value={form.nome} error={errors.nome} onChangeText={(value) => update('nome', value)} onSubmitEditing={() => emailRef.current?.focus()} returnKeyType="next" />
      <FormInput ref={emailRef} label="E-mail" autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" maxLength={45} placeholder="seu@email.com" value={form.email} error={errors.email} onChangeText={(value) => update('email', value)} onSubmitEditing={() => passwordRef.current?.focus()} returnKeyType="next" />
      <View style={styles.passwordGroup}>
        <FormInput ref={passwordRef} label="Senha" autoCapitalize="none" autoComplete="new-password" placeholder="Crie uma senha segura" secureTextEntry value={form.senha} error={errors.senha} onChangeText={(value) => update('senha', value)} onSubmitEditing={() => confirmationRef.current?.focus()} returnKeyType="next" />
        <Text style={styles.rulesTitle}>A senha deve conter:</Text>
        <View style={styles.rules}>
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(form.senha);
            return (
              <View key={rule.label} style={styles.ruleRow}>
                <View style={[styles.ruleDot, met ? styles.ruleDotMet : null]} />
                <Text accessibilityLabel={`${met ? 'Atendido' : 'Pendente'}: ${rule.label}`} style={[styles.ruleText, met ? styles.ruleTextMet : null]}>{rule.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <FormInput ref={confirmationRef} label="Confirmar senha" autoCapitalize="none" autoComplete="new-password" placeholder="Digite a senha novamente" secureTextEntry value={form.confirmacao} error={errors.confirmacao} onChangeText={(value) => update('confirmacao', value)} onSubmitEditing={handleRegister} returnKeyType="done" />
      <FeedbackMessage>{message}</FeedbackMessage>
      <PrimaryButton title="Criar conta" loading={loading} onPress={handleRegister} />
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading }} disabled={loading} onPress={() => router.replace('/login')} style={authStyles.linkButton}>
        <Text style={authStyles.link}>
          <Text style={authStyles.linkPrefix}>Já tem uma conta? </Text>
          Entrar
        </Text>
      </Pressable>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  passwordGroup: { gap: spacing.md },
  rulesTitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  rules: { gap: spacing.xs },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ruleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  ruleDotMet: { backgroundColor: colors.success },
  ruleText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  ruleTextMet: { color: colors.success },
});

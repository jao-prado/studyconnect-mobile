import { useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';

import { AuthScreen, authStyles } from '../../components/AuthScreen';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { forgotPassword, resetPassword } from '../../services/authService';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function recoveryToken(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/[?&]token=([^&#\s]+)/);
  return match ? decodeURIComponent(match[1]) : trimmed;
}

export default function RecuperarSenhaScreen() {
  const confirmationRef = useRef(null);
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('error');
  const [loading, setLoading] = useState(false);

  async function requestReset() {
    if (loading) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrors({ email: 'Informe um e-mail válido.' });
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const result = await forgotPassword(normalizedEmail);
      setEmail(normalizedEmail);
      setStep('reset');
      setMessageKind('success');
      setMessage(result?.message || 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.');
    } catch (error) {
      setMessageKind('error');
      setMessage(error.status === 429 ? 'Muitas tentativas. Aguarde antes de tentar novamente.' : (error.message || 'Não foi possível solicitar a recuperação.'));
    } finally {
      setLoading(false);
    }
  }

  async function submitReset() {
    if (loading) return;
    const nextErrors = {};
    const normalizedToken = recoveryToken(token);
    if (!normalizedToken) nextErrors.token = 'Cole o link ou token recebido por e-mail.';
    if (senha.length < 6) nextErrors.senha = 'A nova senha deve ter no mínimo 6 caracteres.';
    if (!confirmacao) nextErrors.confirmacao = 'Confirme a nova senha.';
    else if (confirmacao !== senha) nextErrors.confirmacao = 'As senhas não coincidem.';
    setErrors(nextErrors);
    setMessage('');
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const result = await resetPassword(normalizedToken, senha);
      setToken('');
      setSenha('');
      setConfirmacao('');
      setStep('success');
      setMessageKind('success');
      setMessage(result?.message || 'Senha redefinida com sucesso.');
    } catch (error) {
      setMessageKind('error');
      setMessage(error.message || 'Token inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  }

  const title = step === 'email' ? 'Recupere sua senha' : step === 'reset' ? 'Crie uma nova senha' : 'Senha atualizada';
  const subtitle = step === 'email' ? 'Informe o e-mail da sua conta.' : step === 'reset' ? 'Cole o link de recuperação recebido ou somente o valor após “token=”.' : 'Você já pode entrar com sua nova senha.';

  return (
    <AuthScreen eyebrow="RECUPERAÇÃO" title={title} subtitle={subtitle}>
      {step === 'email' ? (
        <FormInput label="E-mail" autoCapitalize="none" autoComplete="email" keyboardType="email-address" maxLength={45} value={email} error={errors.email} onChangeText={(value) => { setEmail(value); setErrors({}); }} onSubmitEditing={requestReset} returnKeyType="done" />
      ) : null}
      {step === 'reset' ? (
        <>
          <FormInput label="Link ou token de recuperação" autoCapitalize="none" autoCorrect={false} value={token} error={errors.token} onChangeText={(value) => { setToken(value); setErrors((current) => ({ ...current, token: null })); }} />
          <FormInput label="Nova senha" autoCapitalize="none" autoComplete="new-password" secureTextEntry value={senha} error={errors.senha} onChangeText={(value) => { setSenha(value); setErrors((current) => ({ ...current, senha: null })); }} onSubmitEditing={() => confirmationRef.current?.focus()} returnKeyType="next" />
          <FormInput ref={confirmationRef} label="Confirmar nova senha" autoCapitalize="none" autoComplete="new-password" secureTextEntry value={confirmacao} error={errors.confirmacao} onChangeText={(value) => { setConfirmacao(value); setErrors((current) => ({ ...current, confirmacao: null })); }} onSubmitEditing={submitReset} returnKeyType="done" />
        </>
      ) : null}
      {message ? <Text accessibilityRole="alert" style={[authStyles.message, messageKind === 'success' ? authStyles.success : authStyles.error]}>{message}</Text> : null}
      {step === 'email' ? <PrimaryButton title="Enviar instruções" loading={loading} onPress={requestReset} /> : null}
      {step === 'reset' ? <PrimaryButton title="Redefinir senha" loading={loading} onPress={submitReset} /> : null}
      {step === 'success' ? <PrimaryButton title="Ir para o login" onPress={() => router.replace('/login')} /> : null}
      {step !== 'success' ? <Pressable disabled={loading} onPress={() => router.replace('/login')}><Text style={authStyles.link}>Voltar ao login</Text></Pressable> : null}
    </AuthScreen>
  );
}

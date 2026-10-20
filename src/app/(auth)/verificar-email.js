import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AuthScreen, authStyles } from '../../components/AuthScreen';
import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { resendVerification, verifyEmail } from '../../services/authService';

export default function VerificarEmailScreen() {
  const params = useLocalSearchParams();
  const email = typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('error');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify() {
    if (loading || resending) return;
    if (!email) return setMessage('Volte ao cadastro e informe seu e-mail novamente.');
    if (!/^\d{6}$/.test(code)) return setMessage('Informe o código de 6 dígitos recebido por e-mail.');
    setLoading(true);
    setMessage('');
    try {
      const result = await verifyEmail(email, code);
      setCode('');
      setSuccess(true);
      setMessageKind('success');
      setMessage(result?.message || 'E-mail verificado com sucesso.');
    } catch (error) {
      setMessageKind('error');
      setMessage(error.message || 'Código incorreto ou expirado.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (loading || resending || !email) return;
    setResending(true);
    setMessage('');
    try {
      const result = await resendVerification(email);
      setMessageKind('success');
      setMessage(result?.message || 'Código reenviado.');
    } catch (error) {
      setMessageKind('error');
      setMessage(error.status === 429 ? 'Muitas tentativas. Aguarde antes de reenviar.' : (error.message || 'Não foi possível reenviar o código.'));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthScreen eyebrow="CONFIRMAÇÃO" title="Verifique seu e-mail" subtitle={email ? `Enviamos um código para ${email}.` : 'Informe o código enviado ao seu e-mail.'}>
      {!success ? <FormInput label="Código de verificação" autoCapitalize="none" autoComplete="one-time-code" keyboardType="number-pad" maxLength={6} value={code} error={message && !success ? message : null} onChangeText={(value) => { setCode(value.replace(/\D/g, '')); setMessage(''); }} onSubmitEditing={handleVerify} returnKeyType="done" /> : null}
      {message ? <Text accessibilityRole="alert" style={[authStyles.message, messageKind === 'success' ? authStyles.success : authStyles.error]}>{message}</Text> : null}
      {!success ? <PrimaryButton title="Verificar e-mail" loading={loading} disabled={resending} onPress={handleVerify} /> : <PrimaryButton title="Ir para o login" onPress={() => router.replace('/login')} />}
      {!success ? <Pressable disabled={loading || resending || !email} onPress={handleResend}><Text style={authStyles.link}>{resending ? 'Reenviando…' : 'Reenviar código'}</Text></Pressable> : null}
      {!success ? <Pressable disabled={loading || resending} onPress={() => router.replace('/login')}><Text style={authStyles.link}>Voltar ao login</Text></Pressable> : null}
    </AuthScreen>
  );
}

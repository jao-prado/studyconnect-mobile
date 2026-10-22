import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AuthScreen, authStyles } from '../../components/AuthScreen';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { CodeInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { resendVerification } from '../../services/authService';

export default function VerificarEmailScreen() {
  const { completeSignupVerification } = useAuth();
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
    if (!email) {
      setMessageKind('error');
      setMessage('Volte ao cadastro e informe seu e-mail novamente.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setMessageKind('error');
      setMessage('Informe o código de 6 dígitos recebido por e-mail.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const result = await completeSignupVerification(email, code);
      setCode('');
      if (result.mfaRequired) {
        router.replace('/mfa');
        return;
      }
      setSuccess(true);
      setMessageKind('success');
      if (result.verificationOnly) {
        setMessage(result.message || 'E-mail confirmado. Entre para continuar.');
      } else {
        setMessage('E-mail confirmado. Preparando sua apresentação.');
        router.replace('/home');
      }
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
    <AuthScreen backTo="/cadastro" centered eyebrow="Confirmação de e-mail" icon={success ? 'checkmark-circle-outline' : 'mail-outline'} title={success ? 'E-mail confirmado' : 'Verifique seu e-mail'} subtitle={success ? 'Sua conta está pronta para acessar.' : 'Digite o código de seis dígitos enviado para sua caixa de entrada.'}>
      {!success && email ? (
        <View style={[authStyles.context, authStyles.contextCentered]}>
          <Text style={authStyles.contextLabel}>Código enviado para</Text>
          <Text selectable style={[authStyles.contextValue, authStyles.contextValueCentered]}>{email}</Text>
        </View>
      ) : null}
      {!success ? <CodeInput editable={!loading && !resending} label="Código de verificação" invalid={messageKind === 'error' && Boolean(message)} value={code} onChangeText={(value) => { setCode(value); setMessage(''); }} onSubmitEditing={handleVerify} returnKeyType="done" /> : null}
      <FeedbackMessage kind={messageKind}>{message}</FeedbackMessage>
      {!success ? <PrimaryButton title="Verificar e-mail" loading={loading} disabled={resending} onPress={handleVerify} /> : <PrimaryButton title="Ir para o login" onPress={() => router.replace('/login')} />}
      {!success ? <Pressable accessibilityRole="button" accessibilityState={{ busy: resending, disabled: loading || resending || !email }} disabled={loading || resending || !email} onPress={handleResend} style={authStyles.linkButton}><Text style={authStyles.link}>{resending ? 'Reenviando…' : 'Não recebeu? Reenviar código'}</Text></Pressable> : null}
      {!success ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading || resending }} disabled={loading || resending} onPress={() => router.replace('/login')} style={authStyles.linkButton}><Text style={authStyles.link}><Text style={authStyles.linkPrefix}>Já confirmou? </Text>Entrar</Text></Pressable> : null}
    </AuthScreen>
  );
}

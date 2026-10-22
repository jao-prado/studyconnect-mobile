import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { AuthScreen, authStyles } from '../../components/AuthScreen';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { CodeInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';

export default function MfaScreen() {
  const inputRef = useRef(null);
  const { pendingMfaEmail, verifyMfa, cancelMfa } = useAuth();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pendingMfaEmail) router.replace('/login');
  }, [pendingMfaEmail]);

  async function handleVerify() {
    if (loading) return;
    const normalizedCode = code.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setMessage('Informe o código de 6 dígitos.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await verifyMfa(normalizedCode);
      setCode('');
      router.replace('/home');
    } catch (error) {
      if (error.status === 401) setMessage('Código inválido ou expirado.');
      else if (error.status === 429) setMessage('Muitas tentativas. Aguarde e tente novamente.');
      else setMessage(error.message || 'Não foi possível validar o código.');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    cancelMfa();
    setCode('');
    router.replace('/login');
  }

  return (
    <AuthScreen
      centered
      eyebrow="Segurança da conta"
      icon="shield-checkmark-outline"
      onBack={handleBack}
      title="Verificação de segurança"
      subtitle="Digite o código de seis dígitos para confirmar sua identidade."
    >
      <View style={[authStyles.context, authStyles.contextCentered]}>
        <Text style={authStyles.contextLabel}>Código enviado para</Text>
        <Text selectable style={[authStyles.contextValue, authStyles.contextValueCentered]}>{pendingMfaEmail}</Text>
      </View>
      <CodeInput
        ref={inputRef}
        autoFocus
        editable={!loading}
        invalid={Boolean(message)}
        label="Código de verificação"
        onChangeText={(value) => { setCode(value); setMessage(''); }}
        onSubmitEditing={handleVerify}
        returnKeyType="done"
        value={code}
      />
      <FeedbackMessage>{message}</FeedbackMessage>
      <PrimaryButton disabled={code.length !== 6} loading={loading} onPress={handleVerify} title="Verificar" />
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading }} disabled={loading} onPress={handleBack} style={authStyles.linkButton}>
        <Text style={authStyles.link}>Voltar para o login</Text>
      </Pressable>
    </AuthScreen>
  );
}

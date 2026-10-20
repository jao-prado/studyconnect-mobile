import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormInput } from '../../components/FormInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.icon}><Text style={styles.iconText}>✓</Text></View>
        <Text style={styles.title}>Verificação em duas etapas</Text>
        <Text style={styles.subtitle}>Digite o código enviado para</Text>
        <Text style={styles.email}>{pendingMfaEmail}</Text>

        <View style={styles.form}>
          <FormInput
            ref={inputRef}
            autoFocus
            error={message}
            keyboardType="number-pad"
            label="Código de verificação"
            maxLength={6}
            onChangeText={(value) => { setCode(value.replace(/\D/g, '')); setMessage(''); }}
            onSubmitEditing={handleVerify}
            placeholder="000000"
            textContentType="oneTimeCode"
            value={code}
          />
          <PrimaryButton disabled={code.length !== 6} loading={loading} onPress={handleVerify} title="Verificar código" />
          <Pressable accessibilityRole="button" onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>Voltar para o login</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', padding: 24, width: '100%', maxWidth: 500, alignSelf: 'center' },
  icon: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  iconText: { color: '#C4B5FD', fontSize: 26, fontWeight: '800' },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 15, marginTop: 10 },
  email: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 3 },
  form: { gap: 18, marginTop: 30 },
  backButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#C4B5FD', fontSize: 15, fontWeight: '700' },
});

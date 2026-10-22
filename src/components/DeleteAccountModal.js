import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedbackMessage } from './FeedbackMessage';
import { FormInput } from './FormInput';
import { PrimaryButton } from './PrimaryButton';
import { requestGoogleIdToken } from '../services/googleSignInService';
import { colors } from '../theme/colors';
import { controls, radii, spacing } from '../theme/tokens';

export function DeleteAccountModal({ visible, email, onClose, onLoadMethods, onRequestCode, onConfirm }) {
  const [step, setStep] = useState('loading');
  const [methods, setMethods] = useState(null);
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [proof, setProof] = useState(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    Promise.resolve()
      .then(onLoadMethods)
      .then((result) => {
        if (!active) return;
        if (!result?.hasPassword && !result?.hasGoogle) {
          throw new Error('Esta conta não possui um método de confirmação disponível.');
        }
        setMethods(result);
        setStep('choice');
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError?.message || 'Não foi possível identificar os métodos desta conta.');
        setStep('load-error');
      });
    return () => { active = false; };
  }, [onLoadMethods, visible]);

  function close() {
    if (loading) return;
    setStep('loading');
    setSenha('');
    setCodigo('');
    setProof(null);
    setMfaRequired(false);
    setError('');
    onClose();
  }

  async function loadMethods() {
    setLoading(true);
    setError('');
    try {
      const result = await onLoadMethods();
      if (!result?.hasPassword && !result?.hasGoogle) {
        throw new Error('Esta conta não possui um método de confirmação disponível.');
      }
      setMethods(result);
      setStep('choice');
    } catch (loadError) {
      setError(loadError?.message || 'Não foi possível identificar os métodos desta conta.');
      setStep('load-error');
    } finally {
      setLoading(false);
    }
  }

  async function confirmWith(proofValue) {
    setLoading(true);
    setError('');
    try {
      const result = await onRequestCode(proofValue);
      setProof(proofValue);
      setMfaRequired(result?.mfaRequired === true);
      setStep(result?.mfaRequired ? 'mfa' : 'confirm');
    } catch (requestError) {
      setError(requestError?.message || 'Não foi possível confirmar sua identidade.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmWithGoogle() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const googleIdToken = await requestGoogleIdToken();
      if (!googleIdToken) return;
      const googleProof = { googleIdToken };
      const result = await onRequestCode(googleProof);
      setProof(googleProof);
      setMfaRequired(result?.mfaRequired === true);
      setStep(result?.mfaRequired ? 'mfa' : 'confirm');
    } catch (requestError) {
      setError(requestError?.message || 'Não foi possível confirmar a identidade com Google.');
    } finally {
      setLoading(false);
    }
  }

  function confirmDeletion() {
    if (step === 'mfa' && !/^\d{6}$/.test(codigo)) {
      setError('Informe o código de 6 dígitos recebido por e-mail.');
      return;
    }

    Alert.alert(
      'Excluir sua conta permanentemente?',
      'Suas matrículas, progresso e dados da conta serão removidos. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir conta',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setError('');
            try {
              await onConfirm({ ...proof, ...(codigo ? { codigoMfa: codigo } : {}) });
            } catch (requestError) {
              setError(requestError?.message || 'Não foi possível excluir a conta.');
              if (mfaRequired) setStep('mfa');
              setLoading(false);
            }
          },
        },
      ],
    );
  }

  const title = step === 'mfa' ? 'Verificação de segurança'
    : step === 'confirm' ? 'Confirme a exclusão'
      : 'Excluir sua conta?';
  const description = step === 'mfa'
    ? `Enviamos um código de segurança para ${email || 'seu e-mail'}.`
    : step === 'confirm'
      ? 'Sua identidade foi confirmada. Esta ação é permanente.'
      : 'A confirmação será vinculada à sua sessão e aos métodos de autenticação desta conta.';

  return (
    <Modal animationType="fade" onRequestClose={close} statusBarTranslucent transparent visible={visible}>
      <SafeAreaView style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View accessibilityViewIsModal style={styles.modal}>
              <View style={styles.icon}><Text style={styles.iconText}>!</Text></View>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>

              {step === 'loading' ? <Text style={styles.description}>Identificando os métodos de autenticação…</Text> : null}

              {step === 'load-error' ? (
                <View style={styles.form}>
                  <FeedbackMessage>{error}</FeedbackMessage>
                  <PrimaryButton loading={loading} title="Tentar novamente" onPress={loadMethods} />
                </View>
              ) : null}

              {step === 'choice' ? (
                <View style={styles.form}>
                  {methods?.hasPassword ? (
                    <>
                      <FormInput
                        autoCapitalize="none"
                        autoComplete="current-password"
                        editable={!loading}
                        label="Senha atual"
                        onChangeText={(value) => { setSenha(value); setError(''); }}
                        onSubmitEditing={() => confirmWith({ senha: senha.trim() })}
                        placeholder="Digite sua senha"
                        returnKeyType="send"
                        secureTextEntry
                        value={senha}
                      />
                      <PrimaryButton
                        disabled={!senha.trim() || loading}
                        loading={loading}
                        onPress={() => confirmWith({ senha: senha.trim() })}
                        title="Continuar com senha"
                      />
                    </>
                  ) : null}
                  {methods?.hasGoogle ? (
                    <PrimaryButton
                      disabled={loading}
                      loading={loading && !methods?.hasPassword}
                      onPress={confirmWithGoogle}
                      title="Confirmar com Google"
                      variant={methods?.hasPassword ? 'secondary' : 'primary'}
                    />
                  ) : null}
                  <FeedbackMessage>{error}</FeedbackMessage>
                </View>
              ) : null}

              {step === 'mfa' ? (
                <View style={styles.form}>
                  <FormInput
                    autoCapitalize="none"
                    autoComplete="one-time-code"
                    editable={!loading}
                    inputStyle={styles.codeInput}
                    keyboardType="number-pad"
                    label="Código de segurança"
                    maxLength={6}
                    onChangeText={(value) => { setCodigo(value.replace(/\D/g, '')); setError(''); }}
                    onSubmitEditing={() => setStep('confirm')}
                    placeholder="000000"
                    returnKeyType="done"
                    value={codigo}
                  />
                  <FeedbackMessage>{error}</FeedbackMessage>
                  <PrimaryButton disabled={codigo.length !== 6 || loading} onPress={() => setStep('confirm')} title="Continuar" />
                  <Pressable accessibilityRole="button" disabled={loading} onPress={() => confirmWith(proof)} style={({ pressed }) => [styles.textButton, pressed ? styles.pressed : null]}>
                    <Text style={styles.resendText}>Reenviar código</Text>
                  </Pressable>
                </View>
              ) : null}

              {step === 'confirm' ? (
                <View style={styles.form}>
                  <FeedbackMessage>{error}</FeedbackMessage>
                  <PrimaryButton loading={loading} onPress={confirmDeletion} style={styles.deleteButton} title="Excluir conta permanentemente" />
                </View>
              ) : null}

              <Pressable accessibilityRole="button" disabled={loading || step === 'loading'} onPress={close} style={({ pressed }) => [styles.cancelButton, pressed ? styles.pressed : null]}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  modal: {
    width: '100%',
    maxWidth: controls.contentMaxWidth,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.xxl,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
  },
  iconText: { color: colors.danger, fontSize: 24, lineHeight: 28, fontWeight: '900' },
  title: { color: colors.text, fontSize: 30, lineHeight: 37, fontWeight: '800', letterSpacing: -0.5, marginTop: spacing.lg },
  description: { color: colors.textSecondary, fontSize: 15, lineHeight: 22, fontWeight: '400', marginTop: spacing.sm },
  form: { gap: spacing.lg, marginTop: spacing.xxl },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22, fontVariant: ['tabular-nums'] },
  deleteButton: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
  textButton: { minHeight: controls.minTouch, alignItems: 'center', justifyContent: 'center' },
  resendText: { color: colors.primaryText, fontSize: 14, fontWeight: '700' },
  cancelButton: { minHeight: controls.minTouch, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  cancelText: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});

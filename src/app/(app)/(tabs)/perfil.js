import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormInput } from '../../../components/FormInput';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { StateView } from '../../../components/StateView';
import { useAuth } from '../../../context/AuthContext';
import { getUsuarioById, updateUsuario } from '../../../services/usuarioService';
import { colors } from '../../../theme/colors';

function validImageUrl(value) {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default function PerfilScreen() {
  const { user, updateUser, logout } = useAuth();
  const userId = user?.id;
  const sessionName = user?.nome;
  const sessionPhoto = user?.fotoUrl;
  const [profile, setProfile] = useState(null);
  const [nome, setNome] = useState(user?.nome || '');
  const [fotoUrl, setFotoUrl] = useState(user?.fotoUrl || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getUsuarioById(userId);
      setProfile(data);
      setNome(data?.nome || sessionName || '');
      setFotoUrl(sessionPhoto || '');
      await updateUser(data);
    } catch (requestError) {
      if (requestError?.status !== 401) {
        setError(requestError?.message || 'Não foi possível carregar o perfil.');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionName, sessionPhoto, updateUser, userId]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadProfile(), 0);
    return () => clearTimeout(timeout);
  }, [loadProfile]);

  async function handleSave() {
    const cleanName = nome.trim();
    if (!cleanName) {
      setNameError('Informe seu nome.');
      return;
    }
    setNameError('');
    setSaving(true);
    try {
      const cleanPhoto = fotoUrl.trim();
      const data = await updateUsuario(userId, { nome: cleanName, fotoUrl: cleanPhoto });
      const merged = { ...profile, ...data, nome: cleanName, fotoUrl: cleanPhoto || null };
      setProfile(merged);
      setFotoUrl(cleanPhoto);
      setImageFailed(false);
      await updateUser(merged);
      Alert.alert('Perfil atualizado', 'Suas alterações foram salvas.');
    } catch (requestError) {
      Alert.alert('Não foi possível salvar', requestError?.message || 'Tente novamente em instantes.');
    } finally {
      setSaving(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Sair da conta', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  }

  if (loading && !profile) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><StateView loading title="Carregando perfil" message="Buscando seus dados no StudyConnect." /></SafeAreaView>;
  }

  if (error && !profile) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><StateView title="Não foi possível carregar o perfil" message={error} onRetry={loadProfile} /></SafeAreaView>;
  }

  const imageUrl = imageFailed ? null : validImageUrl(fotoUrl);
  const displayProfile = profile || user;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.eyebrow}>SUA CONTA</Text>
            <Text style={styles.title}>Perfil</Text>
            <Text style={styles.subtitle}>Mantenha seus dados de exibição atualizados.</Text>
          </View>

          <View style={styles.identityCard}>
            {imageUrl ? (
              <Image accessibilityLabel="Foto do perfil" onError={() => setImageFailed(true)} source={{ uri: imageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarText}>{nome.charAt(0).toUpperCase() || 'A'}</Text></View>
            )}
            <View style={styles.identityText}>
              <Text numberOfLines={1} style={styles.identityName}>{nome || displayProfile?.nome}</Text>
              <Text numberOfLines={1} style={styles.identityEmail}>{displayProfile?.email}</Text>
              <Text style={styles.badge}>Aluno</Text>
            </View>
          </View>

          {error ? <Text accessibilityRole="alert" style={styles.errorBanner}>{error}</Text> : null}

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Informações pessoais</Text>
            <FormInput
              autoCapitalize="words"
              autoComplete="name"
              error={nameError}
              label="Nome"
              maxLength={120}
              onChangeText={setNome}
              returnKeyType="next"
              value={nome}
            />
            <FormInput editable={false} label="E-mail" value={displayProfile?.email || ''} />
            <View style={styles.readOnlyRow}>
              <View><Text style={styles.readOnlyLabel}>Tipo de conta</Text><Text style={styles.readOnlyValue}>Aluno</Text></View>
              <View><Text style={styles.readOnlyLabel}>Status</Text><Text style={styles.activeValue}>{displayProfile?.ativo === false ? 'Inativa' : 'Ativa'}</Text></View>
            </View>
            <FormInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              label="URL da foto (opcional)"
              onChangeText={(value) => { setFotoUrl(value); setImageFailed(false); }}
              placeholder="https://exemplo.com/foto.jpg"
              returnKeyType="done"
              value={fotoUrl}
            />
            <Text style={styles.hint}>E-mail, senha e tipo de conta não podem ser alterados por esta tela.</Text>
            <PrimaryButton disabled={!nome.trim()} loading={saving} onPress={handleSave} title="Salvar alterações" />
          </View>

          <Pressable accessibilityRole="button" disabled={saving} onPress={confirmLogout} style={({ pressed }) => [styles.logoutButton, pressed ? styles.pressed : null]}>
            <Text style={styles.logoutText}>Sair da conta</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 20, paddingBottom: 112, gap: 20 },
  eyebrow: { color: '#C4B5FD', fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: 7 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 7 },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#171127', borderWidth: 1, borderColor: '#3B2766', borderRadius: 20, padding: 17 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceRaised },
  avatarText: { color: colors.white, fontSize: 25, fontWeight: '800' },
  identityText: { flex: 1, minWidth: 0 },
  identityName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  identityEmail: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  badge: { alignSelf: 'flex-start', color: '#DDD6FE', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, fontSize: 11, fontWeight: '700', marginTop: 9 },
  formCard: { gap: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  readOnlyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, backgroundColor: colors.background, borderRadius: 14, padding: 14 },
  readOnlyLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  readOnlyValue: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 5 },
  activeValue: { color: '#86EFAC', fontSize: 14, fontWeight: '700', marginTop: 5 },
  errorBanner: { color: '#FCA5A5', backgroundColor: '#3F171B', borderRadius: 13, padding: 13, fontSize: 13 },
  logoutButton: { minHeight: 52, borderWidth: 1, borderColor: '#7F1D1D', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});

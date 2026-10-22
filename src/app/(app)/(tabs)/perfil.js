import { useCallback, useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Alert,
  ActivityIndicator,
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
import { DeleteAccountModal } from '../../../components/DeleteAccountModal';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { StateView } from '../../../components/StateView';
import { useAuth } from '../../../context/AuthContext';
import { getUsuarioById, updateUsuario } from '../../../services/usuarioService';
import { getProfilePhoto, saveProfilePhoto } from '../../../services/profilePhotoStorage';
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
  const { user, updateUser, logout, loadAccountSecurity, requestDeleteCode, deleteAccount } = useAuth();
  const userId = user?.id;
  const sessionName = user?.nome;
  const sessionLocalPhoto = user?.fotoLocalUri;
  const [profile, setProfile] = useState(null);
  const [nome, setNome] = useState(user?.nome || '');
  const [localPhotoUri, setLocalPhotoUri] = useState(user?.fotoLocalUri || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [nameError, setNameError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getUsuarioById(userId);
      setProfile(data);
      setNome(data?.nome || sessionName || '');
      try {
        const savedPhoto = await getProfilePhoto(userId);
        setLocalPhotoUri(savedPhoto || sessionLocalPhoto || null);
        setPhotoError('');
      } catch (photoStorageError) {
        setPhotoError(photoStorageError?.message || 'Não foi possível carregar a foto deste dispositivo.');
      }
      await updateUser(data);
    } catch (requestError) {
      if (requestError?.status !== 401) {
        setError(requestError?.message || 'Não foi possível carregar o perfil.');
      }
    } finally {
      setLoading(false);
    }
  }, [sessionLocalPhoto, sessionName, updateUser, userId]);

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
      const data = await updateUsuario(userId, { nome: cleanName });
      const merged = { ...profile, ...data, nome: cleanName };
      setProfile(merged);
      await updateUser(merged);
      setEditing(false);
      Alert.alert('Perfil atualizado', 'Suas alterações foram salvas.');
    } catch (requestError) {
      Alert.alert('Não foi possível salvar', requestError?.message || 'Tente novamente em instantes.');
    } finally {
      setSaving(false);
    }
  }

  async function selectProfilePhoto(source) {
    if (photoLoading) return;
    setPhotoLoading(true);
    setPhotoError('');
    try {
      const ImagePicker = await import('expo-image-picker');
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Acesso à câmera', 'Permita o uso da câmera nas configurações do dispositivo para tirar uma foto.');
          return;
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const savedUri = await saveProfilePhoto(userId, result.assets[0].uri);
      setLocalPhotoUri(savedUri);
      setImageFailed(false);
      await updateUser({ fotoLocalUri: savedUri });
    } catch (photoErrorValue) {
      const message = /ExponentImagePicker|native module/i.test(photoErrorValue?.message || '')
        ? 'Este Development Build ainda não inclui o seletor de imagens. Recompile e reinstale o app para usar a câmera ou galeria.'
        : photoErrorValue?.message || 'Tente novamente.';
      Alert.alert('Não foi possível atualizar a foto', message);
    } finally {
      setPhotoLoading(false);
    }
  }

  function openPhotoOptions() {
    Alert.alert('Foto do perfil', 'Escolha de onde adicionar sua foto.', [
      { text: 'Tirar foto', onPress: () => void selectProfilePhoto('camera') },
      { text: 'Escolher da galeria', onPress: () => void selectProfilePhoto('library') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
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

  async function handleDeleteAccount(credentials) {
    try {
      await deleteAccount(credentials);
    } catch (deleteError) {
      if (deleteError?.code !== 'ACCOUNT_DELETED_LOCAL_CLEANUP_FAILED') throw deleteError;
      Alert.alert('Conta excluída', deleteError.message);
    }
    setDeleteVisible(false);
    router.replace('/');
  }

  if (loading && !profile) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><StateView loading title="Carregando perfil" message="Buscando seus dados no StudyConnect." /></SafeAreaView>;
  }

  if (error && !profile) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><StateView title="Não foi possível carregar o perfil" message={error} onRetry={loadProfile} /></SafeAreaView>;
  }

  const displayProfile = profile || user;
  const imageUri = imageFailed ? null : localPhotoUri || validImageUrl(displayProfile?.fotoUrl);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.eyebrow}>SUA CONTA</Text>
            <Text style={styles.title}>Perfil</Text>
            <Text style={styles.subtitle}>Sua conta e preferências de estudo.</Text>
          </View>

          <View style={styles.identityCard}>
            {imageUri ? (
              <Image accessibilityLabel="Foto do perfil" onError={() => setImageFailed(true)} source={{ uri: imageUri }} style={styles.avatarImage} />
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

          <View style={styles.actionsCard}>
            <ProfileAction icon="person-outline" label="Editar perfil" onPress={() => setEditing((current) => !current)} />
            {Platform.OS === 'android' ? (
              <>
                <ProfileAction icon="notifications-outline" label="Lembretes de estudo" onPress={() => router.push('/study-settings')} />
                <ProfileAction icon="stats-chart-outline" label="Estatísticas de estudo" onPress={() => router.push('/study-insights')} />
              </>
            ) : null}
            <ProfileAction destructive icon="log-out-outline" label="Sair da conta" onPress={confirmLogout} last />
          </View>

          {editing ? (
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
              <View style={styles.photoRow}>
                {imageUri ? (
                  <Image accessibilityLabel="Prévia da foto do perfil" source={{ uri: imageUri }} style={styles.photoPreview} />
                ) : (
                  <View style={[styles.photoPreview, styles.photoPlaceholder]}>
                    <Ionicons color={colors.primaryText} name="person-outline" size={21} />
                  </View>
                )}
                <View style={styles.photoCopy}>
                  <Text style={styles.photoTitle}>Foto do perfil</Text>
                  <Text style={styles.photoHint}>Escolha uma imagem ou tire uma foto.</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Escolher foto do perfil" disabled={photoLoading || saving} onPress={openPhotoOptions} style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}>
                  {photoLoading
                    ? <ActivityIndicator color={colors.primaryText} size="small" />
                    : <Ionicons color={colors.primaryText} name="camera-outline" size={19} />}
                </Pressable>
              </View>
              {photoError ? <Text accessibilityRole="alert" style={styles.photoError}>{photoError}</Text> : null}
              <Text style={styles.hint}>Sua foto fica salva neste dispositivo. E-mail e tipo de conta não podem ser alterados por esta tela.</Text>
              <PrimaryButton disabled={!nome.trim() || photoLoading} loading={saving} onPress={handleSave} title="Salvar alterações" />
              <Pressable accessibilityRole="button" disabled={saving || photoLoading} onPress={() => setEditing(false)} style={styles.cancelEdit}>
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.dangerZone}>
            <Text style={styles.dangerTitle}>Excluir conta</Text>
            <Text style={styles.dangerDescription}>Remove permanentemente sua conta, matrículas e progresso. Esta ação não pode ser desfeita.</Text>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => setDeleteVisible(true)}
              style={({ pressed }) => [styles.deleteButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.deleteText}>Excluir minha conta</Text>
            </Pressable>
          </View>
        </ScrollView>
        <DeleteAccountModal
          email={displayProfile?.email}
          onLoadMethods={loadAccountSecurity}
          onClose={() => setDeleteVisible(false)}
          onConfirm={handleDeleteAccount}
          onRequestCode={requestDeleteCode}
          visible={deleteVisible}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProfileAction({ icon, label, onPress, destructive = false, last = false }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionRow, last && styles.lastActionRow, pressed && styles.pressed]}>
      <View style={[styles.actionIcon, destructive && styles.destructiveIcon]}>
        <Ionicons color={destructive ? colors.danger : colors.primaryText} name={icon} size={19} />
      </View>
      <Text style={[styles.actionLabel, destructive && styles.destructiveLabel]}>{label}</Text>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28, gap: 16 },
  eyebrow: { color: '#B9A5E8', fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700', marginTop: 4 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 15 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.surfaceRaised },
  avatarText: { color: colors.primaryText, fontSize: 23, fontWeight: '700' },
  identityText: { flex: 1, minWidth: 0 },
  identityName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  identityEmail: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  badge: { alignSelf: 'flex-start', color: '#B9A5E8', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: '600', marginTop: 7 },
  actionsCard: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14 },
  actionRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  lastActionRow: { borderBottomWidth: 0 },
  actionIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.primarySoft },
  actionLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },
  destructiveIcon: { backgroundColor: colors.dangerSoft },
  destructiveLabel: { color: colors.danger },
  formCard: { gap: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  photoRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoPreview: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceRaised },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  photoCopy: { flex: 1 },
  photoTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  photoHint: { color: colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  photoButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.primarySoft },
  photoError: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  readOnlyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, backgroundColor: colors.background, borderRadius: 14, padding: 14 },
  readOnlyLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  readOnlyValue: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 5 },
  activeValue: { color: '#86EFAC', fontSize: 14, fontWeight: '700', marginTop: 5 },
  errorBanner: { color: '#FCA5A5', backgroundColor: '#3F171B', borderRadius: 13, padding: 13, fontSize: 13 },
  cancelEdit: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelEditText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  dangerZone: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20 },
  dangerTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  dangerDescription: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  deleteButton: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', marginTop: 12, paddingHorizontal: 4 },
  deleteText: { color: colors.danger, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});

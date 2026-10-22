import { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrivateAccessModal } from '../../../components/PrivateAccessModal';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { StateView } from '../../../components/StateView';
import { TrilhaCard } from '../../../components/TrilhaCard';
import { useTrilhas } from '../../../context/TrilhasContext';
import { colors } from '../../../theme/colors';
import { privateAccessErrorMessage } from '../../../utils/apiMessages';

export default function ExplorarScreen() {
  const { trilhas, loading, error, ensureLoaded, refresh, acessarTrilhaPrivada, isMatriculado } = useTrilhas();
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    void ensureLoaded().catch(() => {});
  }, [ensureLoaded]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return trilhas;
    return trilhas.filter((trilha) => trilha.nome?.toLocaleLowerCase('pt-BR').includes(query));
  }, [search, trilhas]);

  async function handlePrivateAccess(codigo) {
    setAccessLoading(true);
    setAccessError('');
    try {
      await acessarTrilhaPrivada(codigo);
      setModalVisible(false);
      Alert.alert('Acesso liberado', 'A trilha privada foi adicionada às suas matrículas.');
    } catch (requestError) {
      setAccessError(privateAccessErrorMessage(requestError));
    } finally {
      setAccessLoading(false);
    }
  }

  function handleOpenTrail(trilhaId) {
    router.push({ pathname: '/trilhas/[id]', params: { id: String(trilhaId) } });
  }

  const header = (
    <View style={styles.headerContent}>
      <ScreenHeader eyebrow="DESCOBRIR" title="Explorar trilhas" subtitle="Encontre conteúdos disponíveis para sua conta." />
      <View style={styles.searchWrap}>
        <Ionicons color={colors.textMuted} name="search-outline" size={19} />
        <TextInput
          accessibilityLabel="Buscar trilha por nome"
          autoCorrect={false}
          onChangeText={setSearch}
          placeholder="Buscar trilhas"
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          selectionColor={colors.primary}
          style={styles.search}
          value={search}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => { setAccessError(''); setModalVisible(true); }}
        style={({ pressed }) => [styles.privateButton, pressed ? styles.pressed : null]}
      >
        <View style={styles.privateIcon}><Ionicons color="#DCCBFF" name="key-outline" size={18} /></View>
        <View style={styles.privateCopy}>
          <Text style={styles.privateTitle}>Acessar trilha privada</Text>
          <Text style={styles.privateSubtitle}>Insira o código compartilhado pelo professor</Text>
        </View>
        <Ionicons color="#B9A5E8" name="chevron-forward" size={19} />
      </Pressable>
      {filtered.length > 0 ? <Text style={styles.count}>{filtered.length} {filtered.length === 1 ? 'trilha encontrada' : 'trilhas encontradas'}</Text> : null}
    </View>
  );

  const emptyState = loading && trilhas.length === 0
    ? <StateView loading title="Carregando trilhas" message="O servidor pode levar alguns segundos para iniciar." />
    : error && trilhas.length === 0
      ? <StateView title="Não foi possível carregar" message={error} onRetry={() => refresh().catch(() => {})} />
      : <StateView title={search ? 'Nenhum resultado' : 'Nenhuma trilha disponível'} message={search ? 'Tente buscar usando outro nome.' : 'Novas trilhas aparecerão aqui quando estiverem disponíveis.'} />;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={emptyState}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl colors={[colors.primary]} onRefresh={() => refresh().catch(() => {})} refreshing={loading} tintColor={colors.primary} />}
        renderItem={({ item }) => <TrilhaCard matriculado={isMatriculado(item.id)} onPress={() => handleOpenTrail(item.id)} trilha={item} />}
      />
      {modalVisible ? (
        <PrivateAccessModal
          error={accessError}
          loading={accessLoading}
          onClose={() => { if (!accessLoading) setModalVisible(false); }}
          onSubmit={handlePrivateAccess}
          visible
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 11 },
  headerContent: { gap: 13, marginBottom: 5 },
  searchWrap: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 14 },
  search: { flex: 1, minHeight: 48, color: colors.text, fontSize: 14, paddingVertical: 0 },
  privateButton: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10 },
  privateIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderRadius: 12 },
  privateCopy: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  privateTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  privateSubtitle: { color: colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  count: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
});

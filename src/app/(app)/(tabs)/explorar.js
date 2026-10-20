import { useEffect, useMemo, useState } from 'react';
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

  const header = (
    <View style={styles.headerContent}>
      <ScreenHeader eyebrow="DESCOBRIR" title="Explorar trilhas" subtitle="Encontre conteúdos disponíveis para sua conta." />
      <TextInput
        accessibilityLabel="Buscar trilha por nome"
        autoCorrect={false}
        onChangeText={setSearch}
        placeholder="Buscar por nome..."
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        selectionColor={colors.primary}
        style={styles.search}
        value={search}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => { setAccessError(''); setModalVisible(true); }}
        style={({ pressed }) => [styles.privateButton, pressed ? styles.pressed : null]}
      >
        <View>
          <Text style={styles.privateTitle}>Entrar com código</Text>
          <Text style={styles.privateSubtitle}>Acesse uma trilha privada</Text>
        </View>
        <Text style={styles.privateArrow}>→</Text>
      </Pressable>
      {filtered.length > 0 ? <Text style={styles.count}>{filtered.length} {filtered.length === 1 ? 'trilha encontrada' : 'trilhas encontradas'}</Text> : null}
    </View>
  );

  if (loading && trilhas.length === 0) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><StateView loading title="Carregando trilhas" message="O servidor pode levar alguns segundos para iniciar." /></SafeAreaView>;
  }

  if (error && trilhas.length === 0) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><StateView title="Não foi possível carregar" message={error} onRetry={() => refresh().catch(() => {})} /></SafeAreaView>;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<StateView title={search ? 'Nenhum resultado' : 'Nenhuma trilha disponível'} message={search ? 'Tente buscar usando outro nome.' : 'Novas trilhas aparecerão aqui quando estiverem disponíveis.'} />}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl colors={[colors.primary]} onRefresh={() => refresh().catch(() => {})} refreshing={loading} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TrilhaCard
            matriculado={isMatriculado(item.id)}
            onPress={() => router.push({ pathname: '/trilhas/[id]', params: { id: String(item.id) } })}
            trilha={item}
          />
        )}
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
  list: { padding: 20, paddingBottom: 108, gap: 14 },
  headerContent: { gap: 18, marginBottom: 8 },
  search: { minHeight: 50, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, color: colors.text, fontSize: 15, paddingHorizontal: 16 },
  privateButton: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primarySoft, borderRadius: 17, paddingHorizontal: 17, paddingVertical: 13 },
  pressed: { opacity: 0.75 },
  privateTitle: { color: '#DDD6FE', fontSize: 15, fontWeight: '700' },
  privateSubtitle: { color: '#A78BFA', fontSize: 12, marginTop: 3 },
  privateArrow: { color: '#DDD6FE', fontSize: 23 },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});

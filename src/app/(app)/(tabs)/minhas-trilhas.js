import { useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../../../components/ScreenHeader';
import { StateView } from '../../../components/StateView';
import { TrilhaCard } from '../../../components/TrilhaCard';
import { useTrilhas } from '../../../context/TrilhasContext';
import { useProgresso } from '../../../context/ProgressoContext';
import { colors } from '../../../theme/colors';

export default function MinhasTrilhasScreen() {
  const { minhasTrilhas, loading, error, ensureLoaded, refresh } = useTrilhas();
  const { porTrilha, loadProgressoTrilha } = useProgresso();

  useEffect(() => {
    void ensureLoaded().catch(() => {});
  }, [ensureLoaded]);

  useEffect(() => {
    if (minhasTrilhas.length === 0) return;
    const timeout = setTimeout(() => {
      void Promise.all(
        minhasTrilhas.map((trilha) => loadProgressoTrilha(trilha.id).catch(() => null)),
      );
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadProgressoTrilha, minhasTrilhas]);

  if (loading && minhasTrilhas.length === 0) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><StateView loading title="Carregando matrículas" message="Buscando suas trilhas no StudyConnect." /></SafeAreaView>;
  }

  if (error && minhasTrilhas.length === 0) {
    return <SafeAreaView edges={['top']} style={styles.safeArea}><StateView title="Não foi possível carregar" message={error} onRetry={() => refresh().catch(() => {})} /></SafeAreaView>;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.list}
        data={minhasTrilhas}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<StateView title="Você ainda não possui trilhas" message="Explore as trilhas disponíveis ou use o código fornecido por um professor." />}
        ListHeaderComponent={<View style={styles.header}><ScreenHeader eyebrow="BIBLIOTECA" title="Minhas Trilhas" subtitle="Acompanhe todas as suas matrículas ativas." /></View>}
        refreshControl={<RefreshControl colors={[colors.primary]} onRefresh={() => refresh().catch(() => {})} refreshing={loading} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <TrilhaCard
            matriculado
            onPress={() => router.push({ pathname: '/trilhas/[id]', params: { id: String(item.id) } })}
            progresso={porTrilha[String(item.id)]}
            trilha={item}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  list: { padding: 20, paddingBottom: 108, gap: 14 },
  header: { marginBottom: 10 },
});

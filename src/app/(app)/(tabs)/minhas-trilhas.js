import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
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
  const [selectedTab, setSelectedTab] = useState('active');

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

  const completed = minhasTrilhas.filter((trilha) => Number(porTrilha[String(trilha.id)]?.percentual) >= 100);
  const inProgress = minhasTrilhas.filter((trilha) => Number(porTrilha[String(trilha.id)]?.percentual) < 100 || porTrilha[String(trilha.id)] == null);
  const visibleTrails = selectedTab === 'completed' ? completed : inProgress;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.list}
        data={visibleTrails}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<StateView title={selectedTab === 'completed' ? 'Nenhuma trilha concluída ainda' : 'Você ainda não possui trilhas'} message={selectedTab === 'completed' ? 'As trilhas concluídas aparecerão aqui.' : 'Explore as trilhas disponíveis ou use o código fornecido por um professor.'} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader eyebrow="BIBLIOTECA" title="Minhas trilhas" subtitle="Acompanhe seu aprendizado, no seu ritmo." />
            <View accessibilityRole="tablist" style={styles.tabs}>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: selectedTab === 'active' }} onPress={() => setSelectedTab('active')} style={[styles.tab, selectedTab === 'active' && styles.selectedTab]}>
                <Text style={[styles.tabText, selectedTab === 'active' && styles.selectedTabText]}>Em andamento <Text style={styles.tabCount}>{inProgress.length}</Text></Text>
              </Pressable>
              <Pressable accessibilityRole="tab" accessibilityState={{ selected: selectedTab === 'completed' }} onPress={() => setSelectedTab('completed')} style={[styles.tab, selectedTab === 'completed' && styles.selectedTab]}>
                <Text style={[styles.tabText, selectedTab === 'completed' && styles.selectedTabText]}>Concluídas <Text style={styles.tabCount}>{completed.length}</Text></Text>
              </Pressable>
            </View>
          </View>
        }
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
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 11 },
  header: { gap: 18, marginBottom: 4 },
  tabs: { flexDirection: 'row', padding: 4, gap: 4, backgroundColor: colors.surfaceSubtle, borderRadius: 14 },
  tab: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingHorizontal: 8 },
  selectedTab: { backgroundColor: colors.surfaceElevated },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  selectedTabText: { color: colors.text },
  tabCount: { color: colors.primaryText, fontWeight: '700' },
});

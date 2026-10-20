import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../../context/AuthContext';
import { useTrilhas } from '../../../context/TrilhasContext';
import { colors } from '../../../theme/colors';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { minhasTrilhas, ensureLoaded } = useTrilhas();

  useEffect(() => {
    void ensureLoaded().catch(() => {});
  }, [ensureLoaded]);

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

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logo}><Text style={styles.logoText}>S</Text></View>
            <Text style={styles.brandName}>StudyConnect</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={confirmLogout} style={({ pressed }) => [styles.logout, pressed ? styles.logoutPressed : null]}>
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>INÍCIO</Text>
          <Text style={styles.title}>Olá, {user?.nome?.split(' ')[0] || 'aluno'}!</Text>
          <Text style={styles.subtitle}>Encontre uma trilha e organize seus próximos passos de estudo.</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{minhasTrilhas.length}</Text>
            <Text style={styles.statLabel}>Trilhas ativas</Text>
          </View>
          <Pressable onPress={() => router.push('/explorar')} style={({ pressed }) => [styles.actionCard, pressed ? styles.logoutPressed : null]}>
            <Text style={styles.actionTitle}>Explorar trilhas</Text>
            <Text style={styles.actionText}>Descubra novos conteúdos</Text>
            <Text style={styles.actionArrow}>→</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.nome?.charAt(0)?.toUpperCase() || 'A'}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name}>{user?.nome}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>Aluno</Text></View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 22, paddingBottom: 110, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.white, fontSize: 20, fontWeight: '800' },
  brandName: { color: colors.text, fontSize: 19, fontWeight: '800' },
  logout: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  logoutPressed: { opacity: 0.72 },
  logoutText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  hero: { marginTop: 18 },
  eyebrow: { color: '#C4B5FD', fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 34, lineHeight: 41, fontWeight: '800', marginTop: 9 },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { width: 115, backgroundColor: colors.primarySoft, borderRadius: 20, padding: 18, justifyContent: 'center' },
  statNumber: { color: '#DDD6FE', fontSize: 30, fontWeight: '800' },
  statLabel: { color: '#C4B5FD', fontSize: 12, lineHeight: 17, marginTop: 3 },
  actionCard: { flex: 1, minHeight: 120, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18 },
  actionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  actionText: { color: colors.textMuted, fontSize: 13, marginTop: 5 },
  actionArrow: { color: '#C4B5FD', fontSize: 24, marginTop: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 20 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#C4B5FD', fontSize: 24, fontWeight: '800' },
  profileText: { flex: 1 },
  name: { color: colors.text, fontSize: 18, fontWeight: '700' },
  email: { color: colors.textMuted, fontSize: 14, marginTop: 3 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  badgeText: { color: '#DDD6FE', fontSize: 12, fontWeight: '700' },
});

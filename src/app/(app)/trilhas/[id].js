import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../../components/PrimaryButton';
import { StateView } from '../../../components/StateView';
import { useAuth } from '../../../context/AuthContext';
import { useTrilhas } from '../../../context/TrilhasContext';
import { verificarMatricula } from '../../../services/matriculaService';
import { getTrilhaById } from '../../../services/trilhaService';
import { colors } from '../../../theme/colors';
import { enrollmentErrorMessage } from '../../../utils/apiMessages';

function DetailItem({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function TrilhaDetailScreen() {
  const params = useLocalSearchParams();
  const trilhaId = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const { user } = useAuth();
  const alunoId = user?.id;
  const { matricular, desmatricular, isMatriculado, setTrilha } = useTrilhas();
  const [trilha, setLocalTrilha] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDetails = useCallback(async () => {
    if (!Number.isFinite(trilhaId) || !alunoId) {
      setError('Identificador de trilha inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [nextTrilha, nextEnrolled] = await Promise.all([
        getTrilhaById(trilhaId),
        verificarMatricula(alunoId, trilhaId),
      ]);
      setLocalTrilha(nextTrilha);
      setTrilha(nextTrilha);
      setEnrolled(nextEnrolled);
    } catch (requestError) {
      if (requestError?.status === 403) setError('Você não possui acesso a esta trilha privada.');
      else if (requestError?.status === 404) setError('Esta trilha não foi encontrada.');
      else setError(requestError?.message || 'Não foi possível carregar a trilha.');
    } finally {
      setLoading(false);
    }
  }, [alunoId, setTrilha, trilhaId]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadDetails(), 0);
    return () => clearTimeout(timeout);
  }, [loadDetails]);

  async function handleEnroll() {
    if (mutationLoading) return;
    setMutationLoading(true);
    try {
      await matricular(trilhaId);
      setEnrolled(true);
      Alert.alert('Matrícula realizada', 'A trilha foi adicionada às suas matrículas.');
    } catch (requestError) {
      if (requestError?.status === 409) {
        setEnrolled(true);
      }
      Alert.alert('Não foi possível matricular', enrollmentErrorMessage(requestError, 'add'));
    } finally {
      setMutationLoading(false);
    }
  }

  function confirmUnenroll() {
    if (mutationLoading) return;
    Alert.alert(
      'Sair da trilha',
      'Tem certeza de que deseja cancelar sua matrícula nesta trilha?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desmatricular', style: 'destructive', onPress: handleUnenroll },
      ],
    );
  }

  async function handleUnenroll() {
    setMutationLoading(true);
    try {
      await desmatricular(trilhaId);
      setEnrolled(false);
      if (trilha?.tipo === 'PRIVADA') {
        Alert.alert('Matrícula cancelada', 'O acesso à trilha privada foi removido.');
        router.replace('/minhas-trilhas');
      } else {
        Alert.alert('Matrícula cancelada', 'Você não está mais matriculado nesta trilha.');
      }
    } catch (requestError) {
      Alert.alert('Não foi possível desmatricular', enrollmentErrorMessage(requestError, 'remove'));
    } finally {
      setMutationLoading(false);
    }
  }

  if (loading) {
    return <SafeAreaView style={styles.safeArea}><StateView loading title="Carregando detalhes" message="Buscando as informações da trilha." /></SafeAreaView>;
  }

  if (error || !trilha) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ Voltar</Text></Pressable>
        <StateView title="Não foi possível abrir a trilha" message={error} onRetry={loadDetails} />
      </SafeAreaView>
    );
  }

  const currentEnrollment = enrolled || isMatriculado(trilhaId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.badges}>
            <Text style={styles.subject}>{trilha.disciplina?.trim() || 'Geral'}</Text>
            {trilha.tipo === 'PRIVADA' ? <Text style={styles.privateBadge}>Privada</Text> : <Text style={styles.publicBadge}>Pública</Text>}
          </View>
          <Text style={styles.title}>{trilha.nome}</Text>
          <Text style={styles.description}>{trilha.descricao?.trim() || 'Sem descrição disponível.'}</Text>
        </View>

        <View style={styles.detailsCard}>
          <DetailItem label="Disciplina" value={trilha.disciplina} />
          <DetailItem label="Nível" value={trilha.nivel} />
          <DetailItem label="Professor" value={trilha.professorNome} />
          <DetailItem label="Visibilidade" value={trilha.tipo === 'PRIVADA' ? 'Trilha privada' : 'Trilha pública'} />
        </View>

        <View style={styles.enrollmentCard}>
          <Text style={styles.enrollmentTitle}>{currentEnrollment ? 'Você está matriculado' : 'Comece esta trilha'}</Text>
          <Text style={styles.enrollmentText}>
            {currentEnrollment
              ? 'Esta trilha está disponível em Minhas Trilhas.'
              : 'Confirme sua matrícula para adicionar esta trilha à sua biblioteca.'}
          </Text>
          {currentEnrollment ? (
            <Pressable
              accessibilityRole="button"
              disabled={mutationLoading}
              onPress={confirmUnenroll}
              style={({ pressed }) => [styles.removeButton, pressed ? styles.pressed : null, mutationLoading ? styles.disabled : null]}
            >
              <Text style={styles.removeText}>{mutationLoading ? 'Aguarde...' : 'Desmatricular'}</Text>
            </Pressable>
          ) : (
            <PrimaryButton loading={mutationLoading} onPress={handleEnroll} title="Matricular-se" />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 42, gap: 22 },
  backButton: { alignSelf: 'flex-start', minHeight: 42, justifyContent: 'center', paddingRight: 18 },
  backText: { color: '#C4B5FD', fontSize: 16, fontWeight: '700' },
  hero: { gap: 12 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  subject: { color: '#DDD6FE', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, fontSize: 12, fontWeight: '700' },
  privateBadge: { color: colors.textMuted, backgroundColor: colors.surfaceRaised, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, fontSize: 12, fontWeight: '700' },
  publicBadge: { color: '#86EFAC', backgroundColor: '#123322', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, fontSize: 12, fontWeight: '700' },
  title: { color: colors.text, fontSize: 31, lineHeight: 38, fontWeight: '800' },
  description: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  detailsCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18, gap: 16 },
  detailItem: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 13 },
  detailLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7 },
  detailValue: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 5 },
  enrollmentCard: { backgroundColor: '#111113', borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 19 },
  enrollmentTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  enrollmentText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 18 },
  removeButton: { minHeight: 52, borderWidth: 1, borderColor: '#7F1D1D', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});

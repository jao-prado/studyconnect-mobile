import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AulaCard } from '../../../components/AulaCard';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ProgressBar } from '../../../components/ProgressBar';
import { StateView } from '../../../components/StateView';
import { useAuth } from '../../../context/AuthContext';
import { useProgresso } from '../../../context/ProgressoContext';
import { useTrilhas } from '../../../context/TrilhasContext';
import { getAulasByTrilha } from '../../../services/aulaService';
import { verificarMatricula } from '../../../services/matriculaService';
import { getTrilhaById } from '../../../services/trilhaService';
import { colors } from '../../../theme/colors';
import { enrollmentErrorMessage } from '../../../utils/apiMessages';

function DetailItem({ label, value }) {
  if (!value) return null;
  return <View style={styles.detailItem}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

export default function TrilhaDetailScreen() {
  const params = useLocalSearchParams();
  const trilhaId = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const { user } = useAuth();
  const alunoId = user?.id;
  const { matricular, desmatricular, isMatriculado, setTrilha } = useTrilhas();
  const { isConcluida, loadProgressoTrilha, porTrilha } = useProgresso();
  const [trilha, setLocalTrilha] = useState(null);
  const [aulas, setAulas] = useState([]);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [learningLoading, setLearningLoading] = useState(false);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [error, setError] = useState('');
  const [learningError, setLearningError] = useState('');

  const loadLearning = useCallback(async () => {
    setLearningLoading(true);
    setLearningError('');
    try {
      const [nextAulas] = await Promise.all([
        getAulasByTrilha(trilhaId),
        loadProgressoTrilha(trilhaId),
      ]);
      setAulas(nextAulas);
    } catch (requestError) {
      setLearningError(requestError?.message || 'Não foi possível carregar as aulas e o progresso.');
    } finally {
      setLearningLoading(false);
    }
  }, [loadProgressoTrilha, trilhaId]);

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
      if (nextEnrolled) await loadLearning();
      else setAulas([]);
    } catch (requestError) {
      if (requestError?.status === 403) setError('Você não possui acesso a esta trilha privada.');
      else if (requestError?.status === 404) setError('Esta trilha não foi encontrada.');
      else setError(requestError?.message || 'Não foi possível carregar a trilha.');
    } finally {
      setLoading(false);
    }
  }, [alunoId, loadLearning, setTrilha, trilhaId]);

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
      await loadLearning();
      Alert.alert('Matrícula realizada', 'A trilha foi adicionada às suas matrículas.');
    } catch (requestError) {
      if (requestError?.status === 409) setEnrolled(true);
      Alert.alert('Não foi possível matricular', enrollmentErrorMessage(requestError, 'add'));
    } finally {
      setMutationLoading(false);
    }
  }

  function confirmUnenroll() {
    if (mutationLoading) return;
    Alert.alert('Sair da trilha', 'Tem certeza de que deseja cancelar sua matrícula nesta trilha?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desmatricular', style: 'destructive', onPress: handleUnenroll },
    ]);
  }

  async function handleUnenroll() {
    setMutationLoading(true);
    try {
      await desmatricular(trilhaId);
      setEnrolled(false);
      setAulas([]);
      if (trilha?.tipo === 'PRIVADA') {
        Alert.alert('Matrícula cancelada', 'O acesso à trilha privada foi removido.');
        router.replace('/minhas-trilhas');
      } else Alert.alert('Matrícula cancelada', 'Você não está mais matriculado nesta trilha.');
    } catch (requestError) {
      Alert.alert('Não foi possível desmatricular', enrollmentErrorMessage(requestError, 'remove'));
    } finally {
      setMutationLoading(false);
    }
  }

  if (loading) return <SafeAreaView style={styles.safeArea}><StateView loading title="Carregando detalhes" message="Buscando as informações da trilha." /></SafeAreaView>;
  if (error || !trilha) {
    return <SafeAreaView style={styles.safeArea}><Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ Voltar</Text></Pressable><StateView title="Não foi possível abrir a trilha" message={error} onRetry={loadDetails} /></SafeAreaView>;
  }

  const currentEnrollment = enrolled || isMatriculado(trilhaId);
  const progresso = porTrilha[String(trilhaId)];
  const firstAula = aulas[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ Voltar</Text></Pressable>
        <View style={styles.hero}>
          <View style={styles.badges}>
            <Text style={styles.subject}>{trilha.disciplina?.trim() || 'Geral'}</Text>
            {trilha.tipo === 'PRIVADA' ? <Text style={styles.privateBadge}>Privada</Text> : <Text style={styles.publicBadge}>Pública</Text>}
          </View>
          <Text style={styles.title}>{trilha.nome}</Text>
          <Text style={styles.description}>{trilha.descricao?.trim() || 'Sem descrição disponível.'}</Text>
        </View>

        {currentEnrollment && progresso ? <View style={styles.progressCard}><ProgressBar percentual={progresso.percentual} /><Text style={styles.progressText}>{progresso.aulasConcluidas.length} de {progresso.totalAulas} aulas concluídas</Text></View> : null}

        <View style={styles.detailsCard}>
          <DetailItem label="Disciplina" value={trilha.disciplina} />
          <DetailItem label="Nível" value={trilha.nivel} />
          <DetailItem label="Professor" value={trilha.professorNome} />
          <DetailItem label="Visibilidade" value={trilha.tipo === 'PRIVADA' ? 'Trilha privada' : 'Trilha pública'} />
        </View>

        <View style={styles.enrollmentCard}>
          <Text style={styles.enrollmentTitle}>{currentEnrollment ? 'Você está matriculado' : 'Comece esta trilha'}</Text>
          <Text style={styles.enrollmentText}>{currentEnrollment ? 'Acesse as aulas publicadas abaixo.' : 'Confirme sua matrícula para liberar as aulas desta trilha.'}</Text>
          {currentEnrollment ? <Pressable accessibilityRole="button" disabled={mutationLoading} onPress={confirmUnenroll} style={({ pressed }) => [styles.removeButton, pressed ? styles.pressed : null, mutationLoading ? styles.disabled : null]}><Text style={styles.removeText}>{mutationLoading ? 'Aguarde...' : 'Desmatricular'}</Text></Pressable> : <PrimaryButton loading={mutationLoading} onPress={handleEnroll} title="Matricular-se" />}
        </View>

        {currentEnrollment ? (
          <View style={styles.lessonsSection}>
            <View style={styles.lessonsPreview}>
              <View><Text style={styles.sectionEyebrow}>CONTEÚDO</Text><Text style={styles.sectionTitle}>Aulas da trilha</Text></View>
              {firstAula ? <AulaCard aula={firstAula} concluida={isConcluida(firstAula.id)} index={0} onPress={() => router.push({ pathname: '/trilhas/[trilhaId]/aulas/[aulaId]', params: { trilhaId: String(trilhaId), aulaId: String(firstAula.id) } })} /> : null}
              {!learningLoading && !learningError && aulas.length === 0 ? <View style={styles.lessonsEmpty}><Text style={styles.lessonsEmptyTitle}>Nenhuma aula publicada</Text><Text style={styles.lessonsEmptyText}>Esta trilha ainda não possui aulas disponíveis para alunos.</Text></View> : null}
            </View>
            {learningLoading && aulas.length === 0 ? <StateView loading title="Carregando aulas" /> : null}
            {learningError ? <StateView title="Não foi possível carregar as aulas" message={learningError} onRetry={loadLearning} /> : null}
            {aulas.slice(1).map((aula, index) => <AulaCard aula={aula} concluida={isConcluida(aula.id)} index={index + 1} key={aula.id} onPress={() => router.push({ pathname: '/trilhas/[trilhaId]/aulas/[aulaId]', params: { trilhaId: String(trilhaId), aulaId: String(aula.id) } })} />)}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32, gap: 16 },
  backButton: { alignSelf: 'flex-start', minHeight: 42, justifyContent: 'center', paddingRight: 18 },
  backText: { color: '#C4B5FD', fontSize: 16, fontWeight: '700' },
  hero: { gap: 10 }, badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subject: { color: '#DDD6FE', backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, fontSize: 12, fontWeight: '700' },
  privateBadge: { color: colors.textMuted, backgroundColor: colors.surfaceRaised, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, fontSize: 12, fontWeight: '700' },
  publicBadge: { color: '#86EFAC', backgroundColor: '#123322', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, fontSize: 12, fontWeight: '700' },
  title: { color: colors.text, fontSize: 25, lineHeight: 32, fontWeight: '700', letterSpacing: -0.3 }, description: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  progressCard: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 15 }, progressText: { color: colors.textMuted, fontSize: 12, marginTop: 9 },
  detailsCard: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 15, gap: 13 },
  detailItem: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 13 }, detailLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7 }, detailValue: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 5 },
  enrollmentCard: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 16 }, enrollmentTitle: { color: colors.text, fontSize: 16, fontWeight: '700' }, enrollmentText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 14 },
  removeButton: { minHeight: 52, borderWidth: 1, borderColor: '#7F1D1D', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, removeText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  lessonsSection: { gap: 10 }, lessonsPreview: { gap: 10 }, lessonsEmpty: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15 }, lessonsEmptyTitle: { color: colors.text, fontSize: 14, fontWeight: '600' }, lessonsEmptyText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 }, sectionEyebrow: { color: '#B9A5E8', fontSize: 10, fontWeight: '700', letterSpacing: 1.1 }, sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '700', marginTop: 4 },
  pressed: { opacity: 0.72 }, disabled: { opacity: 0.5 },
});

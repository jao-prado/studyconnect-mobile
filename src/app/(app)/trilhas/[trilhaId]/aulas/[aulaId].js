import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AulaContent } from '../../../../../components/AulaContent';
import { PrimaryButton } from '../../../../../components/PrimaryButton';
import { StateView } from '../../../../../components/StateView';
import { useAuth } from '../../../../../context/AuthContext';
import { useProgresso } from '../../../../../context/ProgressoContext';
import { getAulaById } from '../../../../../services/aulaService';
import { verificarMatricula } from '../../../../../services/matriculaService';
import { colors } from '../../../../../theme/colors';

export default function AulaScreen() {
  const params = useLocalSearchParams();
  const trilhaId = Number(Array.isArray(params.trilhaId) ? params.trilhaId[0] : params.trilhaId);
  const aulaId = Number(Array.isArray(params.aulaId) ? params.aulaId[0] : params.aulaId);
  const { user } = useAuth();
  const alunoId = user?.id;
  const { concluirAula, isConcluida } = useProgresso();
  const [aula, setAula] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');

  const loadAula = useCallback(async () => {
    if (!Number.isFinite(trilhaId) || !Number.isFinite(aulaId) || !alunoId) {
      setError('Identificador de aula inválido.'); setLoading(false); return;
    }
    setLoading(true); setError('');
    try {
      const matriculado = await verificarMatricula(alunoId, trilhaId);
      if (!matriculado) { setError('Uma matrícula ativa é obrigatória para acessar esta aula.'); return; }
      const nextAula = await getAulaById(aulaId);
      if (Number(nextAula?.trilhaId) !== trilhaId) { setError('Esta aula não pertence à trilha informada.'); return; }
      if (nextAula?.status !== 'PUBLICADA') { setError('Esta aula não está publicada para alunos.'); return; }
      setAula(nextAula);
    } catch (requestError) {
      if (requestError?.status === 403) setError('Você não tem acesso a esta aula.');
      else if (requestError?.status === 404) setError('Aula não encontrada.');
      else setError(requestError?.message || 'Não foi possível carregar a aula.');
    } finally { setLoading(false); }
  }, [alunoId, aulaId, trilhaId]);

  useEffect(() => { const timeout = setTimeout(() => void loadAula(), 0); return () => clearTimeout(timeout); }, [loadAula]);

  async function handleComplete() {
    if (completing || isConcluida(aulaId)) return;
    setCompleting(true);
    try {
      await concluirAula(trilhaId, aulaId);
      Alert.alert('Aula concluída', 'Seu progresso foi atualizado.');
    } catch (requestError) {
      Alert.alert('Não foi possível concluir', requestError?.message || 'Tente novamente em instantes.');
      throw requestError;
    } finally { setCompleting(false); }
  }

  if (loading) return <SafeAreaView style={styles.safeArea}><StateView loading title="Carregando aula" message="Preparando o conteúdo." /></SafeAreaView>;
  if (error || !aula) return <SafeAreaView style={styles.safeArea}><Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ Voltar</Text></Pressable><StateView title="Não foi possível abrir a aula" message={error} onRetry={loadAula} /></SafeAreaView>;

  const completed = isConcluida(aulaId);
  const hasQuestion = aula.blocos.some((block) => block?.tipo === 'questionario');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ Voltar para a trilha</Text></Pressable>
        <View style={styles.header}><Text style={styles.eyebrow}>{hasQuestion ? 'QUESTIONÁRIO' : 'AULA'}</Text><Text style={styles.title}>{aula.titulo}</Text>{completed ? <Text style={styles.completedBadge}>✓ Aula concluída</Text> : null}</View>
        <AulaContent aulaConcluida={completed} blocos={aula.blocos} completing={completing} conteudoInvalido={aula.conteudoInvalido} onConcluir={handleComplete} />
        {!hasQuestion ? <View style={styles.completeCard}>{completed ? <Text style={styles.completeText}>Esta aula já foi concluída. Você pode revisar o conteúdo quando quiser.</Text> : <><Text style={styles.completeTitle}>Terminou esta aula?</Text><Text style={styles.completeText}>Marque como concluída somente depois de revisar o conteúdo.</Text><PrimaryButton loading={completing} onPress={handleComplete} title="Marcar como concluída" /></>}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 44, gap: 22 },
  backButton: { alignSelf: 'flex-start', minHeight: 42, justifyContent: 'center', paddingRight: 18 }, backText: { color: '#C4B5FD', fontSize: 15, fontWeight: '700' },
  header: { gap: 8 }, eyebrow: { color: '#C4B5FD', fontSize: 11, fontWeight: '800', letterSpacing: 1.3 }, title: { color: colors.text, fontSize: 29, lineHeight: 36, fontWeight: '800' },
  completedBadge: { alignSelf: 'flex-start', color: '#86EFAC', backgroundColor: '#123322', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, fontSize: 12, fontWeight: '700', marginTop: 5 },
  completeCard: { backgroundColor: '#111113', borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18, gap: 12 }, completeTitle: { color: colors.text, fontSize: 18, fontWeight: '800' }, completeText: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
});

import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';

import { PrimaryButton } from './PrimaryButton';
import { colors } from '../theme/colors';

function safeExternalUrl(block) {
  const value = typeof block?.url === 'string' && block.url.trim()
    ? block.url.trim()
    : typeof block?.conteudo === 'string' ? block.conteudo.trim() : '';

  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function TextBlock({ label, text, highlighted }) {
  return (
    <View style={[styles.textBlock, highlighted ? styles.explanationBlock : null]}>
      {label ? <Text style={styles.blockLabel}>{label}</Text> : null}
      <Text selectable style={styles.blockText}>{text || 'Conteúdo não informado.'}</Text>
    </View>
  );
}

function VideoBlock({ block }) {
  const url = safeExternalUrl(block);

  async function openVideo() {
    if (!url) {
      Alert.alert('Link inválido', 'O endereço deste vídeo não é válido ou não é seguro.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não foi possível abrir', 'Verifique se há um aplicativo disponível para este link.');
    }
  }

  return (
    <View style={styles.videoBlock}>
      <Text style={styles.blockLabel}>VÍDEO</Text>
      <Text numberOfLines={2} style={styles.videoUrl}>{url || 'Link de vídeo inválido.'}</Text>
      <Pressable accessibilityRole="link" onPress={openVideo} style={({ pressed }) => [styles.videoButton, pressed ? styles.pressed : null]}>
        <Text style={styles.videoButtonText}>Abrir vídeo externo ↗</Text>
      </Pressable>
    </View>
  );
}

function normalizeAlternatives(block) {
  if (!Array.isArray(block?.alternativas)) return [];
  return block.alternativas.map((alternative, index) => ({
    id: index,
    texto: typeof alternative === 'string' ? alternative : alternative?.texto || '',
    correta: index === Number(block.correta) || alternative?.correta === true,
  }));
}

function QuestionBlock({ block, aulaConcluida, completing, onCorrect }) {
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(aulaConcluida ? 'correct' : null);
  const [error, setError] = useState('');
  const alternatives = normalizeAlternatives(block);
  const answered = result === 'correct' || aulaConcluida;

  async function answer() {
    const alternative = alternatives.find((item) => item.id === selected);
    if (!alternative) return;
    if (!alternative.correta) {
      setResult('incorrect');
      return;
    }

    setError('');
    try {
      await onCorrect();
      setResult('correct');
    } catch (requestError) {
      setError(requestError?.message || 'Não foi possível registrar a conclusão.');
    }
  }

  if (!block?.pergunta || alternatives.length === 0) {
    return <View style={styles.unknownBlock}><Text style={styles.unknownText}>Questionário incompleto ou inválido.</Text></View>;
  }

  return (
    <View style={styles.questionBlock}>
      <Text style={styles.blockLabel}>QUESTIONÁRIO</Text>
      <Text style={styles.question}>{block.pergunta}</Text>
      <View style={styles.alternatives}>
        {alternatives.map((alternative, index) => {
          const selectedNow = selected === alternative.id;
          const showCorrect = answered && alternative.correta;
          const showWrong = result === 'incorrect' && selectedNow;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedNow }}
              disabled={answered || completing}
              key={`${alternative.id}-${alternative.texto}`}
              onPress={() => { setSelected(alternative.id); setResult(null); }}
              style={[styles.alternative, selectedNow ? styles.alternativeSelected : null, showCorrect ? styles.alternativeCorrect : null, showWrong ? styles.alternativeWrong : null]}
            >
              <View style={styles.letter}><Text style={styles.letterText}>{String.fromCharCode(65 + index)}</Text></View>
              <Text style={styles.alternativeText}>{alternative.texto || 'Alternativa sem texto'}</Text>
              {showCorrect ? <Text style={styles.correctMark}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {result === 'incorrect' ? (
        <View style={styles.wrongFeedback}>
          <Text style={styles.wrongTitle}>Resposta incorreta. Tente novamente.</Text>
          <Pressable onPress={() => { setSelected(null); setResult(null); }}><Text style={styles.tryAgain}>Escolher outra resposta</Text></Pressable>
        </View>
      ) : null}
      {answered ? <Text style={styles.correctFeedback}>Resposta correta. Aula concluída!</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {!answered && result !== 'incorrect' ? (
        <PrimaryButton disabled={selected === null} loading={completing} onPress={answer} title="Responder" />
      ) : null}
    </View>
  );
}

export function AulaContent({ blocos, conteudoInvalido, aulaConcluida, completing, onConcluir }) {
  if (conteudoInvalido) {
    return <View style={styles.unknownBlock}><Text style={styles.unknownText}>O conteúdo desta aula está em um formato inválido.</Text></View>;
  }

  if (!blocos?.length) {
    return <View style={styles.unknownBlock}><Text style={styles.unknownText}>Esta aula ainda não possui conteúdo.</Text></View>;
  }

  return (
    <View style={styles.container}>
      {blocos.map((block, index) => {
        const key = String(block?.id ?? `${block?.tipo || 'block'}-${index}`);
        if (block?.tipo === 'explicacao') return <TextBlock highlighted key={key} label="EXPLICAÇÃO" text={block.conteudo} />;
        if (block?.tipo === 'texto_livre') return <TextBlock key={key} text={block.conteudo} />;
        if (block?.tipo === 'video') return <VideoBlock block={block} key={key} />;
        if (block?.tipo === 'questionario') {
          return <QuestionBlock aulaConcluida={aulaConcluida} block={block} completing={completing} key={key} onCorrect={onConcluir} />;
        }
        return <View key={key} style={styles.unknownBlock}><Text style={styles.unknownText}>Bloco de conteúdo não suportado.</Text></View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 17 },
  textBlock: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18 },
  explanationBlock: { backgroundColor: '#171127', borderColor: '#3B2766' },
  blockLabel: { color: '#C4B5FD', fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 9 },
  blockText: { color: colors.text, fontSize: 16, lineHeight: 25 },
  videoBlock: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18 },
  videoUrl: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  videoButton: { minHeight: 48, backgroundColor: colors.primarySoft, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  videoButtonText: { color: '#DDD6FE', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  questionBlock: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18 },
  question: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  alternatives: { gap: 10, marginVertical: 18 },
  alternative: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
  alternativeSelected: { borderColor: colors.primary, backgroundColor: '#171127' },
  alternativeCorrect: { borderColor: '#2F855A', backgroundColor: '#123322' },
  alternativeWrong: { borderColor: '#991B1B', backgroundColor: '#3F171B' },
  letter: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  letterText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  alternativeText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  correctMark: { color: '#86EFAC', fontSize: 18, fontWeight: '800' },
  wrongFeedback: { backgroundColor: '#3F171B', borderRadius: 13, padding: 14, marginBottom: 14 },
  wrongTitle: { color: '#FCA5A5', fontSize: 14, fontWeight: '700' },
  tryAgain: { color: '#FECACA', fontSize: 13, fontWeight: '700', marginTop: 9 },
  correctFeedback: { color: '#86EFAC', backgroundColor: '#123322', borderRadius: 13, padding: 14, fontSize: 14, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginVertical: 12 },
  unknownBlock: { backgroundColor: colors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 15, padding: 16 },
  unknownText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
});

import { apiRequest } from './apiClient';

function parseConteudo(conteudo) {
  if (!conteudo) return { blocos: [], conteudoInvalido: false };

  try {
    const parsed = typeof conteudo === 'string' ? JSON.parse(conteudo) : conteudo;
    const blocos = Array.isArray(parsed?.blocos) ? parsed.blocos : [];
    return {
      blocos: [...blocos].sort((a, b) => Number(a?.ordem || 0) - Number(b?.ordem || 0)),
      conteudoInvalido: !Array.isArray(parsed?.blocos),
    };
  } catch {
    return { blocos: [], conteudoInvalido: true };
  }
}

function normalizeAula(aula) {
  const parsed = parseConteudo(aula?.conteudo);
  return { ...aula, ...parsed };
}

export async function getAulasByTrilha(trilhaId) {
  const response = await apiRequest(`/aulas/trilha/${trilhaId}`);
  if (!Array.isArray(response)) return [];

  return response
    .filter((aula) => aula?.status === 'PUBLICADA')
    .map(normalizeAula)
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
}

export async function getAulaById(aulaId) {
  const aula = await apiRequest(`/aulas/${aulaId}`);
  return normalizeAula(aula);
}

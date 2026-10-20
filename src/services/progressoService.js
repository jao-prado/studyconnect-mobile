import { apiRequest } from './apiClient';

export async function getAulasConcluidas(alunoId) {
  const response = await apiRequest(`/progresso/aluno/${alunoId}/ids`);
  return Array.isArray(response) ? response.map(Number).filter(Number.isFinite) : [];
}

export function getProgressoTrilha(trilhaId, alunoId) {
  return apiRequest(`/progresso/trilha/${trilhaId}/aluno/${alunoId}`);
}

export function concluirAula(alunoId, aulaId) {
  return apiRequest('/progresso/concluir', {
    method: 'POST',
    body: { alunoId, aulaId },
  });
}

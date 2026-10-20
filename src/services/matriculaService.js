import { apiRequest } from './apiClient';

export function getMatriculasDoAluno(alunoId) {
  return apiRequest(`/matriculas/aluno/${alunoId}`);
}

export async function verificarMatricula(alunoId, trilhaId) {
  const response = await apiRequest(`/matriculas/existe?alunoId=${encodeURIComponent(alunoId)}&trilhaId=${encodeURIComponent(trilhaId)}`);
  return response?.matriculado === true;
}

export function matricular(alunoId, trilhaId) {
  return apiRequest('/matriculas', {
    method: 'POST',
    body: { alunoId, trilhaId },
  });
}

export function desmatricular(alunoId, trilhaId) {
  return apiRequest(`/matriculas/${trilhaId}/aluno/${alunoId}`, {
    method: 'DELETE',
  });
}

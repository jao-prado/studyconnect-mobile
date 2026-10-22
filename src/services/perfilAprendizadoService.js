import { apiRequest } from './apiClient';

/** @param {number | string} alunoId */
function profilePath(alunoId) {
  const id = Number(alunoId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('A sessão do aluno é inválida. Entre novamente.');
  }
  return `/perfil-aprendizado/${id}`;
}

/** @param {number | string} alunoId */
export function getPerfilAprendizado(alunoId) {
  return apiRequest(profilePath(alunoId));
}

/** 404 significa apenas que o perfil ainda não foi criado; demais falhas precisam ser tratadas. @param {number | string} alunoId */
export async function findPerfilAprendizado(alunoId) {
  try {
    return await getPerfilAprendizado(alunoId);
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) return null;
    throw error;
  }
}

/** @param {ReturnType<import('../onboarding/profile').buildProfilePayload>} payload */
export function createPerfilAprendizado(payload) {
  return apiRequest('/perfil-aprendizado', { method: 'POST', body: payload });
}

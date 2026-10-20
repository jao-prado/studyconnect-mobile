import { apiRequest } from './apiClient';

function sanitizeTrilha(trilha) {
  if (!trilha || typeof trilha !== 'object') return trilha;

  const { codigoAcesso: _codigoAcesso, ...safeTrilha } = trilha;
  return safeTrilha;
}

export async function getTrilhas() {
  const trilhas = await apiRequest('/trilhas');
  return Array.isArray(trilhas) ? trilhas.map(sanitizeTrilha) : [];
}

export async function getTrilhaById(trilhaId) {
  const trilha = await apiRequest(`/trilhas/${trilhaId}`);
  return sanitizeTrilha(trilha);
}

export function acessarTrilhaPrivada(codigo) {
  return apiRequest('/trilhas/acesso', {
    method: 'POST',
    body: { codigo },
    logoutOnUnauthorized: false,
  });
}

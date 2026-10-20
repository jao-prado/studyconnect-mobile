import { apiRequest } from './apiClient';

export function getUsuarioById(usuarioId) {
  return apiRequest(`/usuarios/${usuarioId}`);
}

export function updateUsuario(usuarioId, { nome, fotoUrl }) {
  return apiRequest(`/usuarios/${usuarioId}`, {
    method: 'PUT',
    body: { nome, fotoUrl },
  });
}

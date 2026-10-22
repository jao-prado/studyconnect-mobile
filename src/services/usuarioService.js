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

export function requestAccountDeletionCode(usuarioId, senha) {
  return apiRequest(`/usuarios/${usuarioId}/delete-challenge`, {
    method: 'POST',
    body: senha ? { senha } : {},
  });
}

export function getAccountSecurity() {
  return apiRequest('/auth/account-security');
}

export function requestAccountDeletionChallenge({ senha, googleIdToken }) {
  return apiRequest('/auth/account-deletion/challenge', {
    method: 'POST',
    body: {
      ...(senha ? { senha } : {}),
      ...(googleIdToken ? { googleIdToken } : {}),
    },
  });
}

export function deleteOwnAccount(usuarioId, { senha, codigoMfa, googleIdToken }) {
  return apiRequest('/auth/account-deletion', {
    method: 'DELETE',
    body: {
      ...(senha ? { senha } : {}),
      ...(codigoMfa ? { codigoMfa } : {}),
      ...(googleIdToken ? { googleIdToken } : {}),
    },
    logoutOnUnauthorized: false,
  }).catch(async (deleteError) => {
    if (deleteError?.status < 500 || deleteError?.status >= 600) throw deleteError;
    try {
      await getUsuarioById(usuarioId);
    } catch (verificationError) {
      if (verificationError?.status === 404) return null;
    }
    throw deleteError;
  });
}

export function deleteAccount(usuarioId, { senha, codigoMfa }) {
  return apiRequest(`/usuarios/${usuarioId}`, {
    method: 'DELETE',
    body: {
      ...(senha ? { senha } : {}),
      ...(codigoMfa ? { codigoMfa } : {}),
    },
    // A sessão é limpa explicitamente pelo AuthContext somente após a exclusão.
    logoutOnUnauthorized: false,
  }).catch(async (deleteError) => {
    if (deleteError?.status < 500 || deleteError?.status >= 600) throw deleteError;

    // A exclusão pode ter sido concluída antes de o servidor falhar ao responder.
    try {
      await getUsuarioById(usuarioId);
    } catch (verificationError) {
      if (verificationError?.status === 404) return null;
    }

    throw deleteError;
  });
}

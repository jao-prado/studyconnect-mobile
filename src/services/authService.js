import { apiRequest } from './apiClient';

function validateAuthResponse(data) {
  if (!data?.accessToken || !data?.expiresIn || !data?.id || !data?.role) {
    throw new Error('O servidor retornou dados de autenticação inválidos.');
  }
  return data;
}

export async function login(email, senha) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, senha },
  });

  if (data?.mfaPendente === true) return data;
  return validateAuthResponse(data);
}

export async function verifyMfa(email, code) {
  const data = await apiRequest('/auth/mfa/verify', {
    method: 'POST',
    auth: false,
    body: { email, code },
  });
  return validateAuthResponse(data);
}

export function getCurrentUser(userId) {
  return apiRequest(`/usuarios/${userId}`);
}

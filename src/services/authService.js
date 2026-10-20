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

export function registerStudent(nome, email, senha) {
  return apiRequest('/usuarios', { method: 'POST', auth: false, body: { nome, email, senha } });
}

export function verifyEmail(email, code) {
  return apiRequest('/auth/verify-email', { method: 'POST', auth: false, body: { email, code } });
}

export function resendVerification(email) {
  return apiRequest('/auth/resend-verification', { method: 'POST', auth: false, body: { email } });
}

export function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', { method: 'POST', auth: false, body: { email } });
}

export function resetPassword(token, novaSenha) {
  return apiRequest('/auth/reset-password', { method: 'POST', auth: false, body: { token, novaSenha } });
}

export function getCurrentUser(userId) {
  return apiRequest(`/usuarios/${userId}`);
}

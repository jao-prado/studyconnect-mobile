import * as SecureStore from 'expo-secure-store';

const REGISTRATION_KEY = 'studyconnect.registration-completion';

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export async function saveRegistrationCompletion(email, token) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || typeof token !== 'string' || !token) {
    throw new Error('Não foi possível guardar a confirmação temporária do cadastro.');
  }
  await SecureStore.setItemAsync(REGISTRATION_KEY, JSON.stringify({
    email: normalizedEmail,
    token,
  }));
}

export async function readRegistrationCompletion(email) {
  const stored = await SecureStore.getItemAsync(REGISTRATION_KEY);
  if (!stored) return null;
  try {
    const value = JSON.parse(stored);
    if (value?.email !== normalizeEmail(email) || typeof value?.token !== 'string' || !value.token) {
      await clearRegistrationCompletion();
      return null;
    }
    return value.token;
  } catch {
    await clearRegistrationCompletion();
    return null;
  }
}

export async function clearRegistrationCompletion() {
  await SecureStore.deleteItemAsync(REGISTRATION_KEY);
}

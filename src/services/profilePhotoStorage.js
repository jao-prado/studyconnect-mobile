import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

const STORAGE_PREFIX = 'studyconnect.profile-photo.v1.';
const photoQueues = new Map();
const deletedUsers = new Set();

function serialize(userId, operation) {
  const key = String(userId);
  const previous = photoQueues.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  photoQueues.set(key, current);
  return current.finally(() => {
    if (photoQueues.get(key) === current) photoQueues.delete(key);
  });
}

function storageKeyFor(userId) {
  if (userId === null || userId === undefined || String(userId).trim() === '') {
    throw new Error('Identificador de usuário inválido para a foto do perfil.');
  }
  return `${STORAGE_PREFIX}${encodeURIComponent(String(userId))}`;
}

async function deleteFile(uri) {
  if (!uri) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

export async function getProfilePhoto(userId) {
  if (deletedUsers.has(String(userId))) return null;
  const key = storageKeyFor(userId);
  const uri = await AsyncStorage.getItem(key);
  if (!uri) return null;

  const file = new File(uri);
  if (!file.exists) {
    await AsyncStorage.removeItem(key);
    return null;
  }
  return file.uri;
}

export async function saveProfilePhoto(userId, sourceUri) {
  if (typeof sourceUri !== 'string' || !sourceUri.trim()) {
    throw new Error('A foto selecionada não possui um arquivo válido.');
  }

  return serialize(userId, async () => {
    if (deletedUsers.has(String(userId))) {
      throw new Error('Esta conta foi excluída e não pode salvar novos dados locais.');
    }
    const key = storageKeyFor(userId);
    const previousUri = await AsyncStorage.getItem(key);
    const directory = new Directory(Paths.document, 'profile-photos');
    directory.create({ idempotent: true, intermediates: true });

    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const destination = new File(directory, `profile-${encodeURIComponent(String(userId))}-${uniqueId}.jpg`);
    await new File(sourceUri).copy(destination);

    try {
      if (deletedUsers.has(String(userId))) {
        throw new Error('Esta conta foi excluída e não pode salvar novos dados locais.');
      }
      await AsyncStorage.setItem(key, destination.uri);
    } catch (error) {
      if (destination.exists) destination.delete();
      throw error;
    }

    if (previousUri && previousUri !== destination.uri) await deleteFile(previousUri);
    return destination.uri;
  });
}

export async function clearProfilePhoto(userId) {
  deletedUsers.add(String(userId));
  return serialize(userId, async () => {
    const key = storageKeyFor(userId);
    const uri = await AsyncStorage.getItem(key);
    await deleteFile(uri);
    await AsyncStorage.removeItem(key);
  });
}

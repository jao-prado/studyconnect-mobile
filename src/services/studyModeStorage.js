import AsyncStorage from '@react-native-async-storage/async-storage';

import { studyModeStorageKeyFor } from '../utils/studyModeUtils';

const writeQueues = new Map();
const deletedUsers = new Set();

function serialize(userId, operation) {
  const key = String(userId);
  const previous = writeQueues.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  writeQueues.set(key, current);
  return current.finally(() => {
    if (writeQueues.get(key) === current) writeQueues.delete(key);
  });
}

export async function readStudyModeData(userId) {
  const stored = await AsyncStorage.getItem(studyModeStorageKeyFor(userId));
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    await AsyncStorage.removeItem(studyModeStorageKeyFor(userId));
    return null;
  }
}

export async function saveStudyModeData(userId, data) {
  return serialize(userId, async () => {
    if (deletedUsers.has(String(userId))) return;
    await AsyncStorage.setItem(studyModeStorageKeyFor(userId), JSON.stringify(data));
  });
}

export async function clearStudyModeData(userId) {
  deletedUsers.add(String(userId));
  return serialize(userId, () => AsyncStorage.removeItem(studyModeStorageKeyFor(userId)));
}

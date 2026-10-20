import AsyncStorage from '@react-native-async-storage/async-storage';

import { studyModeStorageKeyFor } from '../utils/studyModeUtils';

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
  await AsyncStorage.setItem(studyModeStorageKeyFor(userId), JSON.stringify(data));
}


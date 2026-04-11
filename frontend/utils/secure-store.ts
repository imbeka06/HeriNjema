// ============================================================================
// Platform-safe SecureStore wrapper
// expo-secure-store is not available on web
// ============================================================================

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const getItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(key);
};

export const setItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(key, value);
};

export const deleteItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') return;
  await SecureStore.deleteItemAsync(key);
};

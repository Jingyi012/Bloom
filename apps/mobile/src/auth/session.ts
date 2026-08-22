import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'bloom.access-token';
const REFRESH_TOKEN_KEY = 'bloom.refresh-token';

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
};

export async function readSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);

  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

export async function writeSession(session: StoredSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

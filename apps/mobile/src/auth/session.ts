import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { CurrentUserResponse } from "@/types/api";
import type { StoredSession } from "@/types/session";

const ACCESS_TOKEN_KEY = "bloom.access-token";
const REFRESH_TOKEN_KEY = "bloom.refresh-token";
const SESSION_USER_KEY = "bloom.session-user";

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
    AsyncStorage.removeItem(SESSION_USER_KEY),
  ]);
}

export async function readSessionUser(): Promise<CurrentUserResponse | null> {
  const value = await AsyncStorage.getItem(SESSION_USER_KEY);
  if (!value) return null;

  try {
    const user = JSON.parse(value) as Partial<CurrentUserResponse>;
    return typeof user.id === "string" &&
      typeof user.displayName === "string" &&
      typeof user.email === "string" &&
      typeof user.timeZoneId === "string" &&
      (user.avatarUrl === null || typeof user.avatarUrl === "string")
      ? (user as CurrentUserResponse)
      : null;
  } catch {
    return null;
  }
}

export async function writeSessionUser(user: CurrentUserResponse): Promise<void> {
  await AsyncStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
}

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import Constants from 'expo-constants';
import { bloomApi } from '@/api/client';
import { clearSession, readSession, writeSession } from '@/auth/session';
import type { CurrentUserResponse } from '@/types/api';
import type { StoredSession } from '@/types/session';
import { getDeviceTimeZone } from '@/utils/device';
import { useSettings } from '@/settings/SettingsProvider';

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  isLoading: boolean;
  session: StoredSession | null;
  user: CurrentUserResponse | null;
  error: string | null;
  clearError: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const { t } = useSettings();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    selectAccount: true,
  }, { scheme: 'com.bestfriends.bloom' });
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void restoreSession().then((restored) => {
      if (mounted) {
        setIsLoading(false);
        if (restored) {
          setSession(restored.session);
          setUser(restored.user);
        }
      }
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (response?.type !== 'success') {
      if (response?.type === 'error') setError(t('signInFailed'));
      return;
    }

    const idToken = response.params.id_token;
    if (!idToken) {
      setError(t('missingIdentityToken'));
      return;
    }

    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
        const result = await bloomApi.signInWithGoogle(idToken, { platform, nonce: request?.nonce });
        const nextSession = { accessToken: result.accessToken, refreshToken: result.refreshToken };
        await writeSession(nextSession);
        const nextUser = await syncDeviceTimeZone(result.accessToken, await bloomApi.me(result.accessToken));
        if (!cancelled) {
          setSession(nextSession);
          setUser(nextUser);
        }
      } catch (error) {
        if (!cancelled) {
          const detail = error instanceof Error && error.message.startsWith('Bloom API request failed')
            ? t('requestFailed')
            : error instanceof Error ? error.message : t('unknownSignInError');
          setError(`${t('sessionStartFailed')}: ${detail}`);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [request, response]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (!request) {
      setError(t('signInLoading'));
      return;
    }
    await promptAsync();
  }, [promptAsync, request, t]);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
    setUser(null);
  }, []);
  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(() => ({ isLoading, session, user, error, clearError, signInWithGoogle, signOut }), [clearError, error, isLoading, session, signInWithGoogle, signOut, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

async function restoreSession(): Promise<{ session: StoredSession; user: CurrentUserResponse } | null> {
  const stored = await readSession();
  if (!stored) return null;
  try {
    return { session: stored, user: await syncDeviceTimeZone(stored.accessToken, await bloomApi.me(stored.accessToken)) };
  } catch {
    try {
      const refreshed = await bloomApi.refresh(stored.refreshToken);
      const nextSession = { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken };
      await writeSession(nextSession);
      return { session: nextSession, user: await syncDeviceTimeZone(nextSession.accessToken, await bloomApi.me(nextSession.accessToken)) };
    } catch {
      await clearSession();
      return null;
    }
  }
}

async function syncDeviceTimeZone(accessToken: string, user: CurrentUserResponse): Promise<CurrentUserResponse> {
  const deviceTimeZone = getDeviceTimeZone();
  if (user.timeZoneId === deviceTimeZone) return user;
  try {
    return await bloomApi.updateProfile(accessToken, user.displayName, deviceTimeZone);
  } catch {
    return user;
  }
}

export function getApiConfiguration(): { apiUrl: string; googleClientIdConfigured: boolean } {
  return {
    apiUrl: (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:5052/api/v1',
    googleClientIdConfigured: Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
  };
}

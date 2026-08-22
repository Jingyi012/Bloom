import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import Constants from 'expo-constants';
import { bloomApi, type CurrentUserResponse } from '@/api/client';
import { clearSession, readSession, writeSession, type StoredSession } from '@/auth/session';

WebBrowser.maybeCompleteAuthSession();

type AuthContextValue = {
  isLoading: boolean;
  session: StoredSession | null;
  user: CurrentUserResponse | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
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
    if (response?.type !== 'success' || !request?.nonce) {
      if (response?.type === 'error') setError('Google sign-in could not be completed.');
      return;
    }

    const idToken = response.params.id_token;
    if (!idToken) {
      setError('Google did not return an identity token.');
      return;
    }

    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
        const result = await bloomApi.signInWithGoogle(idToken, { platform, nonce: request.nonce! });
        const nextSession = { accessToken: result.accessToken, refreshToken: result.refreshToken };
        const nextUser = await bloomApi.me(result.accessToken);
        await writeSession(nextSession);
        if (!cancelled) {
          setSession(nextSession);
          setUser(nextUser);
        }
      } catch {
        if (!cancelled) setError('Bloom could not start your session. Check the API URL and try again.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [request, response]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (!request) {
      setError('Google sign-in is still loading.');
      return;
    }
    await promptAsync();
  }, [promptAsync, request]);

  const signOut = useCallback(async () => {
    await clearSession();
    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ isLoading, session, user, error, signInWithGoogle, signOut }), [error, isLoading, session, signInWithGoogle, signOut, user]);
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
    return { session: stored, user: await bloomApi.me(stored.accessToken) };
  } catch {
    try {
      const refreshed = await bloomApi.refresh(stored.refreshToken);
      const nextSession = { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken };
      await writeSession(nextSession);
      return { session: nextSession, user: await bloomApi.me(nextSession.accessToken) };
    } catch {
      await clearSession();
      return null;
    }
  }
}

export function getApiConfiguration(): { apiUrl: string; googleClientIdConfigured: boolean } {
  return {
    apiUrl: (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:5052/api/v1',
    googleClientIdConfigured: Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
  };
}

import Constants from 'expo-constants';

const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined)
  ?? process.env.EXPO_PUBLIC_API_URL
  ?? 'http://127.0.0.1:5052/api/v1';

export type GoogleSignInRequest = {
  platform: 'ios' | 'android' | 'web';
  nonce?: string;
};

export type GoogleSignInResponse = {
  userId: string;
  displayName: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAtUtc: string;
};

export type CurrentUserResponse = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  timeZoneId: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Bloom API request failed (${response.status})`);
  }

  return response.status === 204 ? (undefined as T) : (await response.json() as T);
}

export const bloomApi = {
  signInWithGoogle: (googleIdToken: string, request: GoogleSignInRequest) => requestJson<GoogleSignInResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify(request),
    headers: { Authorization: `Bearer ${googleIdToken}` },
  }),
  refresh: (refreshToken: string) => requestJson<{ accessToken: string; refreshToken: string; accessTokenExpiresAtUtc: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }),
  me: (accessToken: string) => requestJson<CurrentUserResponse>('/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
};

function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}

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

export type CircleSummary = {
  id: string;
  name: string;
  emoji: string;
  status: 'Draft' | 'Sealed' | 'Bloomed' | 'Archived' | string;
  bloomAtUtc: string;
  timeZoneId: string;
  memberCount: number;
  isCreator: boolean;
  canLeave: boolean;
};

export type CircleMember = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  joinedAtUtc: string;
  isActive: boolean;
};

export type CircleDetail = {
  circle: CircleSummary;
  members: CircleMember[];
};

export type CircleInvitation = {
  id: string;
  circleId: string;
  circleName: string;
  circleEmoji: string;
  createdAtUtc: string;
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
  listCircles: (accessToken: string) => requestJson<CircleSummary[]>('/circles', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  createCircle: (accessToken: string, request: { name: string; emoji: string; durationMonths: number; timeZoneId: string }) => requestJson<CircleDetail>('/circles', {
    method: 'POST',
    body: JSON.stringify(request),
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  getCircle: (accessToken: string, circleId: string) => requestJson<CircleDetail>(`/circles/${circleId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  listCircleInvitations: (accessToken: string) => requestJson<CircleInvitation[]>('/circles/invitations', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  respondToCircleInvitation: (accessToken: string, invitationId: string, accept: boolean) => requestJson<void>(`/circles/invitations/${invitationId}/response`, {
    method: 'POST',
    body: JSON.stringify({ accept }),
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  inviteToCircle: (accessToken: string, circleId: string, email: string) => requestJson<{ invitationId: string; status: string }>(`/circles/${circleId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  leaveCircle: (accessToken: string, circleId: string) => requestJson<void>(`/circles/${circleId}/leave`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
};

function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}

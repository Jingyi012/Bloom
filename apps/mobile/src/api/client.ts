import Constants from 'expo-constants';
import type {
  CircleDetail,
  CircleInvitation,
  CircleSummary,
  CreateCircleRequest,
  CurrentUserResponse,
  EntrySubmissionRequest,
  EntrySubmissionResponse,
  TimelineResponse,
  CommentPageResponse,
  Comment as ApiComment,
  Reaction,
  GoogleSignInRequest,
  GoogleSignInResponse,
  InviteCircleMemberResponse,
  RefreshSessionResponse,
  UserStatsResponse,
} from '@/types/api';

const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined)
  ?? process.env.EXPO_PUBLIC_API_URL
  ?? 'http://127.0.0.1:5052/api/v1';

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

async function requestMultipart<T>(path: string, formData: FormData, accessToken: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Bloom API request failed (${response.status})`);
  return response.status === 204 ? (undefined as T) : (await response.json() as T);
}

export const bloomApi = {
  mediaUrl: (mediaId: string) => `${apiUrl}/media/${mediaId}/content`,
  signInWithGoogle: (googleIdToken: string, request: GoogleSignInRequest) => requestJson<GoogleSignInResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify(request),
    headers: { Authorization: `Bearer ${googleIdToken}` },
  }),
  refresh: (refreshToken: string) => requestJson<RefreshSessionResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }),
  me: (accessToken: string) => requestJson<CurrentUserResponse>('/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  updateProfile: (accessToken: string, displayName: string, timeZoneId: string) => requestJson<CurrentUserResponse>('/me', {
    method: 'PATCH',
    body: JSON.stringify({ displayName, timeZoneId }),
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  stats: (accessToken: string) => requestJson<UserStatsResponse>('/me/stats', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  deleteAccount: (accessToken: string) => requestJson<void>('/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  listCircles: (accessToken: string) => requestJson<CircleSummary[]>('/circles', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  createCircle: (accessToken: string, request: CreateCircleRequest) => requestJson<CircleDetail>('/circles', {
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
  inviteToCircle: (accessToken: string, circleId: string, email: string) => requestJson<InviteCircleMemberResponse>(`/circles/${circleId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  leaveCircle: (accessToken: string, circleId: string) => requestJson<void>(`/circles/${circleId}/leave`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  submitEntry: (accessToken: string, request: EntrySubmissionRequest) => requestJson<EntrySubmissionResponse>('/entries', {
    method: 'POST',
    body: JSON.stringify(request),
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  submitEntryWithMedia: (accessToken: string, request: EntrySubmissionRequest, imageUri: string) => {
    const formData = new FormData();
    formData.append('clientEntryId', request.clientEntryId);
    formData.append('authorLocalDate', request.authorLocalDate);
    formData.append('authorTimeZoneId', request.authorTimeZoneId);
    formData.append('text', request.text);
    if (request.mood) formData.append('mood', request.mood);
    if (request.promptKey) formData.append('promptKey', request.promptKey);
    formData.append('circleIds', request.circleIds.join(','));
    formData.append('image', { uri: imageUri, name: 'bloom-entry.jpg', type: 'image/jpeg' } as unknown as Blob);
    return requestMultipart<EntrySubmissionResponse>('/entries/with-media', formData, accessToken);
  },
  getTimeline: (accessToken: string, circleId: string, cursor?: string) => requestJson<TimelineResponse>(`/circles/${circleId}/timeline${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  getEntry: (accessToken: string, publicationId: string) => requestJson<TimelineResponse['items'][number]>(`/entries/${publicationId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  addReaction: (accessToken: string, publicationId: string, emojiCode: string) => requestJson<Reaction>(`/entries/${publicationId}/reactions/${encodeURIComponent(emojiCode)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  removeReaction: (accessToken: string, publicationId: string, emojiCode: string) => requestJson<Reaction>(`/entries/${publicationId}/reactions/${encodeURIComponent(emojiCode)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  getComments: (accessToken: string, publicationId: string, cursor?: string) => requestJson<CommentPageResponse>(`/entries/${publicationId}/comments${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  addComment: (accessToken: string, publicationId: string, body: string) => requestJson<ApiComment>(`/entries/${publicationId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
  deleteComment: (accessToken: string, commentId: string) => requestJson<void>(`/entries/comments/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  }),
};

function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}

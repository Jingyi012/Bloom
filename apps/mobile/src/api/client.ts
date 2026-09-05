import Constants from "expo-constants";
import type {
  CircleDetail,
  CircleDeleteResponse,
  CircleInvitation,
  CircleSummary,
  CreateCircleRequest,
  UpdateCircleRequest,
  CurrentUserResponse,
  EntrySubmissionRequest,
  EntrySubmissionResponse,
  TimelineResponse,
  TodayEntryStatus,
  UpdateTodayEntryRequest,
  CommentPageResponse,
  Comment as ApiComment,
  Reaction,
  GoogleSignInRequest,
  GoogleSignInResponse,
  InviteCircleMemberResponse,
  RefreshSessionResponse,
  UserStatsResponse,
  TimelineEntry,
  DiaryCalendarResponse,
  FriendSummary,
} from "@/types/api";

const apiUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://127.0.0.1:5052/api/v1";

/** Resolves API-relative asset references while preserving configured subpaths. */
export function resolveApiUrl(reference: string): string {
  if (/^https?:\/\//i.test(reference)) return reference;
  return `${apiUrl.replace(/\/+$/, "")}/${reference.replace(/^\/+/, "")}`;
}

const API_REQUEST_TIMEOUT_MS = 20_000;
type SessionRefreshHandler = () => Promise<string | null>;
let sessionRefreshHandler: SessionRefreshHandler | null = null;
let sessionRefreshInFlight: Promise<string | null> | null = null;

/** Registers the auth provider's refresh callback for transparent 401 recovery. */
export function configureSessionRefresh(handler: SessionRefreshHandler): () => void {
  sessionRefreshHandler = handler;
  return () => {
    if (sessionRefreshHandler === handler) sessionRefreshHandler = null;
  };
}

async function refreshAccessToken(): Promise<string | null> {
  if (!sessionRefreshHandler) return null;
  if (!sessionRefreshInFlight) {
    sessionRefreshInFlight = sessionRefreshHandler().finally(() => {
      sessionRefreshInFlight = null;
    });
  }
  return sessionRefreshInFlight;
}

async function getApiErrorMessage(response: Response): Promise<string> {
  const fallback = `Bloom API request failed (${response.status})`;
  const body = await response.text();
  if (!body) return fallback;

  try {
    const payload = JSON.parse(body) as unknown;
    if (typeof payload === "string") return payload;
    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      for (const key of ["detail", "message", "title", "error"]) {
        if (typeof record[key] === "string" && record[key]) return record[key] as string;
      }
    }
  } catch {
    // Some API validation responses are plain text rather than JSON.
  }

  return body.trim() || fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchApi(path, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) throw new Error(await getApiErrorMessage(response));

  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

async function requestMultipart<T>(
  path: string,
  formData: FormData,
  accessToken: string,
  method: "POST" | "PATCH" = "POST",
): Promise<T> {
  const response = await fetchApi(path, {
    method,
    body: formData,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) throw new Error(await getApiErrorMessage(response));
  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

async function fetchApi(path: string, init: RequestInit, canRefresh = true): Promise<Response> {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${apiUrl}${path}`, init);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Bloom request timed out. Check your connection and try again.");
    }
    throw error;
  }

  const authorization = new Headers(init.headers).get("Authorization");
  if (response.status !== 401 || !canRefresh || path.startsWith("/auth/") || !authorization?.startsWith("Bearer ")) {
    return response;
  }

  const nextAccessToken = await refreshAccessToken();
  if (!nextAccessToken) return response;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${nextAccessToken}`);
  return fetchApi(path, { ...init, headers }, false);
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export const bloomApi = {
  mediaUrl: (mediaId: string) => `${apiUrl}/media/${mediaId}/content`,
  signInWithGoogle: (googleIdToken: string, request: GoogleSignInRequest) =>
    requestJson<GoogleSignInResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify(request),
      headers: { Authorization: `Bearer ${googleIdToken}` },
    }),
  refresh: (refreshToken: string) =>
    requestJson<RefreshSessionResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
  me: (accessToken: string) =>
    requestJson<CurrentUserResponse>("/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  updateProfile: (
    accessToken: string,
    displayName: string,
    timeZoneId: string,
  ) =>
    requestJson<CurrentUserResponse>("/me", {
      method: "PATCH",
      body: JSON.stringify({ displayName, timeZoneId }),
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  uploadAvatar: (accessToken: string, uri: string, contentType = "image/jpeg") => {
    const formData = new FormData();
    formData.append("avatar", {
      uri,
      name: `avatar.${contentType.split("/")[1] ?? "jpg"}`,
      type: contentType,
    } as unknown as Blob);
    return requestMultipart<CurrentUserResponse>("/me/avatar", formData, accessToken);
  },
  stats: (accessToken: string) =>
    requestJson<UserStatsResponse>("/me/stats", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  friends: (accessToken: string) =>
    requestJson<FriendSummary[]>("/me/friends", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  deleteAccount: (accessToken: string) =>
    requestJson<void>("/me", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  listCircles: (accessToken: string) =>
    requestJson<CircleSummary[]>("/circles", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  listArchivedCircles: (accessToken: string) =>
    requestJson<CircleSummary[]>("/circles/archived", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  createCircle: (accessToken: string, request: CreateCircleRequest) =>
    requestJson<CircleDetail>("/circles", {
      method: "POST",
      body: JSON.stringify(request),
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  getCircle: (accessToken: string, circleId: string) =>
    requestJson<CircleDetail>(`/circles/${circleId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  updateCircle: (
    accessToken: string,
    circleId: string,
    request: UpdateCircleRequest,
  ) =>
    requestJson<CircleDetail>(`/circles/${circleId}`, {
      method: "PATCH",
      body: JSON.stringify(request),
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  deleteCircle: (accessToken: string, circleId: string) =>
    requestJson<CircleDeleteResponse>(`/circles/${circleId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  archiveCircle: (accessToken: string, circleId: string) =>
    requestJson<void>(`/circles/${circleId}/archive`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  unarchiveCircle: (accessToken: string, circleId: string) =>
    requestJson<void>(`/circles/${circleId}/archive`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  listCircleInvitations: (accessToken: string) =>
    requestJson<CircleInvitation[]>("/circles/invitations", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  respondToCircleInvitation: (
    accessToken: string,
    invitationId: string,
    accept: boolean,
  ) =>
    requestJson<void>(`/circles/invitations/${invitationId}/response`, {
      method: "POST",
      body: JSON.stringify({ accept }),
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  inviteToCircle: (accessToken: string, circleId: string, email: string) =>
    requestJson<InviteCircleMemberResponse>(
      `/circles/${circleId}/invitations`,
      {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    ),
  leaveCircle: (accessToken: string, circleId: string) =>
    requestJson<void>(`/circles/${circleId}/leave`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  removeCircleMember: (accessToken: string, circleId: string, memberUserId: string) =>
    requestJson<void>(`/circles/${circleId}/members/${memberUserId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  getTodayEntry: (accessToken: string) =>
    requestJson<TodayEntryStatus>("/entries/today", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  getDiaryCalendar: (accessToken: string, from: string, to: string) =>
    requestJson<DiaryCalendarResponse>(
      `/entries/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    ),
  updateTodayEntry: (accessToken: string, request: UpdateTodayEntryRequest) =>
    requestJson<TodayEntryStatus>("/entries/today", {
      method: "PATCH",
      body: JSON.stringify(request),
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  updateTodayEntryWithMedia: (
    accessToken: string,
    request: UpdateTodayEntryRequest & { circleIds: string[]; retainedMediaIds: string[] },
    imageUris: string[],
  ) => {
    const formData = new FormData();
    formData.append("text", request.text);
    if (request.mood) formData.append("mood", request.mood);
    if (request.promptKey) formData.append("promptKey", request.promptKey);
    formData.append("circleIds", request.circleIds.join(","));
    formData.append("retainedMediaIds", request.retainedMediaIds.join(","));
    imageUris.forEach((imageUri, index) => {
      const extension = imageUri.split("?")[0]?.split(".").pop()?.toLowerCase();
      const type =
        extension === "png"
          ? "image/png"
          : extension === "heic" || extension === "heif"
            ? "image/heic"
            : "image/jpeg";
      formData.append("images", {
        uri: imageUri,
        name: `bloom-entry-edit-${index + 1}.${extension || "jpg"}`,
        type,
      } as unknown as Blob);
    });
    return requestMultipart<TodayEntryStatus>(
      "/entries/today/with-media",
      formData,
      accessToken,
      "PATCH",
    );
  },
  deleteTodayEntry: (accessToken: string) =>
    requestJson<void>("/entries/today", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  submitEntry: (accessToken: string, request: EntrySubmissionRequest) =>
    requestJson<EntrySubmissionResponse>("/entries", {
      method: "POST",
      body: JSON.stringify(request),
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  submitEntryWithMedia: (
    accessToken: string,
    request: EntrySubmissionRequest,
    imageUris: string[],
  ) => {
    const formData = new FormData();
    formData.append("clientEntryId", request.clientEntryId);
    formData.append("authorLocalDate", request.authorLocalDate);
    formData.append("authorTimeZoneId", request.authorTimeZoneId);
    formData.append("text", request.text);
    if (request.mood) formData.append("mood", request.mood);
    if (request.promptKey) formData.append("promptKey", request.promptKey);
    formData.append("circleIds", request.circleIds.join(","));
    imageUris.forEach((imageUri, index) => {
      const extension = imageUri.split("?")[0]?.split(".").pop()?.toLowerCase();
      const type =
        extension === "png"
          ? "image/png"
          : extension === "heic" || extension === "heif"
            ? "image/heic"
            : "image/jpeg";
      formData.append("images", {
        uri: imageUri,
        name: `bloom-entry-${index + 1}.${extension || "jpg"}`,
        type,
      } as unknown as Blob);
    });
    return requestMultipart<EntrySubmissionResponse>(
      "/entries/with-media",
      formData,
      accessToken,
    );
  },
  getTimeline: (
    accessToken: string,
    circleId: string,
    cursor?: string,
    date?: string,
    authorUserId?: string,
  ) => {
    const query = new URLSearchParams();
    if (cursor) query.set("cursor", cursor);
    if (date) query.set("date", date);
    if (authorUserId) query.set("authorUserId", authorUserId);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return requestJson<TimelineResponse>(
      `/circles/${circleId}/timeline${suffix}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  },
  getEntry: (accessToken: string, publicationId: string) =>
    requestJson<TimelineEntry>(`/entries/${publicationId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  addReaction: (
    accessToken: string,
    publicationId: string,
    emojiCode: string,
  ) =>
    requestJson<Reaction>(
      `/entries/${publicationId}/reactions/${encodeURIComponent(emojiCode)}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    ),
  removeReaction: (
    accessToken: string,
    publicationId: string,
    emojiCode: string,
  ) =>
    requestJson<Reaction>(
      `/entries/${publicationId}/reactions/${encodeURIComponent(emojiCode)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    ),
  getComments: (accessToken: string, publicationId: string, cursor?: string) =>
    requestJson<CommentPageResponse>(
      `/entries/${publicationId}/comments${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    ),
  addComment: (accessToken: string, publicationId: string, body: string) =>
    requestJson<ApiComment>(`/entries/${publicationId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  deleteComment: (accessToken: string, commentId: string) =>
    requestJson<void>(`/entries/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};

function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}

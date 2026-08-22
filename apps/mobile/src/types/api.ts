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

export type RefreshSessionResponse = {
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

export type CreateCircleRequest = {
  name: string;
  emoji: string;
  durationMonths: number;
  timeZoneId: string;
};

export type InviteCircleMemberRequest = {
  email: string;
};

export type InviteCircleMemberResponse = {
  invitationId: string;
  status: string;
};

export type EntrySubmissionRequest = {
  clientEntryId: string;
  authorLocalDate: string;
  authorTimeZoneId: string;
  text: string;
  mood?: string;
  promptKey?: string;
  circleIds: string[];
};

export type EntrySubmissionResponse = {
  diaryEntryId: string;
  publicationIds: string[];
  circleIds: string[];
  authorLocalDate: string;
  submittedAtUtc: string;
};

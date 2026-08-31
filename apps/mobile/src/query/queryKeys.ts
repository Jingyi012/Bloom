export const queryKeys = {
  me: ["me"] as const,
  home: ["home"] as const,
  circles: ["circles"] as const,
  archivedCircles: ["circles", "archived"] as const,
  invitations: ["circle-invitations"] as const,
  stats: ["stats"] as const,
  circle: (circleId: string) => ["circle", circleId] as const,
  todayEntry: ["entries", "today"] as const,
  diaryCalendar: (from: string, to: string) => ["entries", "calendar", from, to] as const,
  timeline: (circleId: string, date?: string, authorUserId?: string) =>
    ["timeline", circleId, date ?? null, authorUserId ?? null] as const,
  entry: (publicationId: string) => ["entry", publicationId] as const,
  comments: (publicationId: string) => ["comments", publicationId] as const,
};

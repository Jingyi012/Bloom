namespace Bloom.Contracts.Entries;

/// <summary>Text-only diary submission for the first sealed-writing slice.</summary>
public sealed record SubmitEntryRequest(
    string ClientEntryId,
    DateOnly AuthorLocalDate,
    string AuthorTimeZoneId,
    string Text,
    string? Mood,
    string? PromptKey,
    IReadOnlyList<Guid> CircleIds);

/// <summary>Safe metadata returned after the entry is sealed.</summary>
public sealed record EntrySubmissionResponse(
    Guid DiaryEntryId,
    IReadOnlyList<Guid> PublicationIds,
    IReadOnlyList<Guid> CircleIds,
    DateOnly AuthorLocalDate,
    DateTimeOffset SubmittedAtUtc);

/// <summary>Safe metadata describing the current user's diary status for today.</summary>
public sealed record TodayEntryResponse(
    bool HasEntry,
    DateOnly AuthorLocalDate,
    Guid? DiaryEntryId,
    DateTimeOffset? SubmittedAtUtc,
    IReadOnlyList<Guid> CircleIds,
    IReadOnlyList<Guid> MediaIds,
    string? Text,
    string? Mood,
    string? PromptKey,
    bool CanModify,
    DateTimeOffset? ModificationEndsAtUtc);

/// <summary>Request to update the current user's diary during today's edit window.</summary>
public sealed record UpdateTodayEntryRequest(string Text, string? Mood, string? PromptKey);

/// <summary>One entry returned by a bloomed timeline.</summary>
public sealed record TimelineEntryResponse(
    Guid PublicationId,
    Guid DiaryEntryId,
    Guid AuthorUserId,
    string AuthorDisplayName,
    string? AuthorAvatarUrl,
    DateOnly AuthorLocalDate,
    DateTimeOffset SubmittedAtUtc,
    string Text,
    string? Mood,
    IReadOnlyList<Guid> MediaIds,
    IReadOnlyList<ReactionResponse> Reactions,
    int CommentCount);

/// <summary>One calendar day returned by a bloomed timeline.</summary>
public sealed record TimelineDayResponse(DateOnly Date, IReadOnlyList<TimelineEntryResponse> Entries);

/// <summary>Cursor-paginated timeline response grouped by complete days.</summary>
public sealed record TimelineResponse(IReadOnlyList<TimelineDayResponse> Days, string? NextCursor);

/// <summary>Reaction count for one emoji.</summary>
public sealed record ReactionResponse(string EmojiCode, int Count, bool ReactedByCurrentUser);

/// <summary>Request body for a new comment.</summary>
public sealed record CreateCommentRequest(string Body);

/// <summary>Safe comment response.</summary>
public sealed record CommentResponse(Guid Id, Guid AuthorUserId, string AuthorDisplayName, string? AuthorAvatarUrl, string Body, DateTimeOffset CreatedAtUtc, bool IsMine);

/// <summary>Cursor-paginated comment response.</summary>
public sealed record CommentPageResponse(IReadOnlyList<CommentResponse> Items, string? NextCursor);

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
    IReadOnlyList<ReactionResponse> Reactions,
    int CommentCount);

/// <summary>Cursor-paginated timeline response.</summary>
public sealed record TimelineResponse(IReadOnlyList<TimelineEntryResponse> Items, string? NextCursor);

/// <summary>Reaction count for one emoji.</summary>
public sealed record ReactionResponse(string EmojiCode, int Count, bool ReactedByCurrentUser);

/// <summary>Request body for a new comment.</summary>
public sealed record CreateCommentRequest(string Body);

/// <summary>Safe comment response.</summary>
public sealed record CommentResponse(Guid Id, Guid AuthorUserId, string AuthorDisplayName, string? AuthorAvatarUrl, string Body, DateTimeOffset CreatedAtUtc, bool IsMine);

/// <summary>Cursor-paginated comment response.</summary>
public sealed record CommentPageResponse(IReadOnlyList<CommentResponse> Items, string? NextCursor);

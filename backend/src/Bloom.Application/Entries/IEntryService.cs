using Bloom.Domain.Entries;
using Bloom.Application.Media;

namespace Bloom.Application.Entries;

/// <summary>Coordinates sealed diary entry submissions.</summary>
public interface IEntryService
{
    /// <summary>Gets the current user's sealed-entry status for today.</summary>
    Task<TodayEntryStatus> GetTodayStatusAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Updates the current user's diary while today's edit window is open.</summary>
    Task<TodayEntryStatus> UpdateTodayAsync(Guid userId, string text, string? mood, string? promptKey, CancellationToken cancellationToken);

    /// <summary>Permanently deletes the current user's diary while today's edit window is open.</summary>
    Task<bool> DeleteTodayAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Submits one text entry to one or more eligible sealed circles.</summary>
    Task<EntrySubmissionResult> SubmitAsync(
        Guid authorUserId,
        string clientEntryId,
        DateOnly authorLocalDate,
        string authorTimeZoneId,
        string text,
        string? mood,
        string? promptKey,
        IReadOnlyCollection<Guid> circleIds,
        CancellationToken cancellationToken);

    /// <summary>Submits an entry and stores encrypted local images owned by the diary entry.</summary>
    Task<EntrySubmissionResult> SubmitWithMediaAsync(
        Guid authorUserId,
        string clientEntryId,
        DateOnly authorLocalDate,
        string authorTimeZoneId,
        string text,
        string? mood,
        string? promptKey,
        IReadOnlyCollection<Guid> circleIds,
        IReadOnlyCollection<ImageUpload> images,
        CancellationToken cancellationToken);

    /// <summary>Gets a page of entries visible in a bloomed circle.</summary>
    Task<TimelinePage> GetTimelineAsync(Guid userId, Guid circleId, string? cursor, DateOnly? date, Guid? authorUserId, CancellationToken cancellationToken);

    /// <summary>Gets one publication visible in a bloomed circle.</summary>
    Task<TimelineEntry> GetPublicationAsync(Guid userId, Guid publicationId, CancellationToken cancellationToken);

    /// <summary>Adds an allow-listed reaction to a visible publication.</summary>
    Task<ReactionSummary> AddReactionAsync(Guid userId, Guid publicationId, string emojiCode, CancellationToken cancellationToken);

    /// <summary>Removes the current user's reaction from a visible publication.</summary>
    Task<ReactionSummary> RemoveReactionAsync(Guid userId, Guid publicationId, string emojiCode, CancellationToken cancellationToken);

    /// <summary>Gets a page of comments for a visible publication.</summary>
    Task<CommentPage> GetCommentsAsync(Guid userId, Guid publicationId, string? cursor, CancellationToken cancellationToken);

    /// <summary>Adds a comment to a visible publication.</summary>
    Task<CommentResult> AddCommentAsync(Guid userId, Guid publicationId, string body, CancellationToken cancellationToken);

    /// <summary>Deletes a comment authored by the current user.</summary>
    Task<bool> DeleteCommentAsync(Guid userId, Guid commentId, CancellationToken cancellationToken);
}

/// <summary>Safe metadata returned after an entry has been sealed.</summary>
public sealed record EntrySubmissionResult(
    Guid DiaryEntryId,
    IReadOnlyList<Guid> PublicationIds,
    IReadOnlyList<Guid> CircleIds,
    DateOnly AuthorLocalDate,
    DateTimeOffset SubmittedAtUtc);

/// <summary>Safe metadata describing whether the current user has sealed today's diary.</summary>
public sealed record TodayEntryStatus(
    bool HasEntry,
    DateOnly AuthorLocalDate,
    Guid? DiaryEntryId,
    DateTimeOffset? SubmittedAtUtc,
    IReadOnlyList<Guid> CircleIds,
    string? Text,
    string? Mood,
    string? PromptKey,
    bool CanModify,
    DateTimeOffset? ModificationEndsAtUtc);

/// <summary>One safe, post-bloom timeline item.</summary>
public sealed record TimelineEntry(
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
    IReadOnlyList<ReactionSummary> Reactions,
    int CommentCount);

/// <summary>A cursor page of timeline items.</summary>
public sealed record TimelinePage(IReadOnlyList<TimelineEntry> Items, string? NextCursor);

/// <summary>Reaction totals for a publication and emoji.</summary>
public sealed record ReactionSummary(string EmojiCode, int Count, bool ReactedByCurrentUser);

/// <summary>A comment visible in a bloomed timeline.</summary>
public sealed record CommentResult(Guid Id, Guid AuthorUserId, string AuthorDisplayName, string? AuthorAvatarUrl, string Body, DateTimeOffset CreatedAtUtc, bool IsMine);

/// <summary>A cursor page of comments.</summary>
public sealed record CommentPage(IReadOnlyList<CommentResult> Items, string? NextCursor);

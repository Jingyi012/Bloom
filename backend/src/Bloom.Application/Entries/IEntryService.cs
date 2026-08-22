using Bloom.Domain.Entries;

namespace Bloom.Application.Entries;

/// <summary>Coordinates sealed diary entry submissions.</summary>
public interface IEntryService
{
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
}

/// <summary>Safe metadata returned after an entry has been sealed.</summary>
public sealed record EntrySubmissionResult(
    Guid DiaryEntryId,
    IReadOnlyList<Guid> PublicationIds,
    IReadOnlyList<Guid> CircleIds,
    DateOnly AuthorLocalDate,
    DateTimeOffset SubmittedAtUtc);

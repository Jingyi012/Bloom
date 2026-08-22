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

using Bloom.Domain.Common;

namespace Bloom.Domain.Entries;

/// <summary>Stores the author's private text submission before it is revealed at bloom.</summary>
public sealed class DiaryEntry : AuditableEntity
{
    private DiaryEntry()
    {
    }

    /// <summary>Gets the author identifier.</summary>
    public Guid AuthorUserId { get; private set; }

    /// <summary>Gets the client-generated idempotency identifier.</summary>
    public string ClientEntryId { get; private set; } = string.Empty;

    /// <summary>Gets the author's local calendar date.</summary>
    public DateOnly AuthorLocalDate { get; private set; }

    /// <summary>Gets the author's IANA time-zone identifier.</summary>
    public string AuthorTimeZoneId { get; private set; } = "UTC";

    /// <summary>Gets the private diary text.</summary>
    public string Text { get; private set; } = string.Empty;

    /// <summary>Gets the optional mood key.</summary>
    public string? Mood { get; private set; }

    /// <summary>Gets the optional prompt key.</summary>
    public string? PromptKey { get; private set; }

    /// <summary>Creates a sealed text-only diary entry.</summary>
    public static DiaryEntry Create(
        Guid authorUserId,
        string clientEntryId,
        DateOnly authorLocalDate,
        string authorTimeZoneId,
        string text,
        string? mood,
        string? promptKey)
    {
        if (authorUserId == Guid.Empty) throw new ArgumentException("Author is required.", nameof(authorUserId));
        ArgumentException.ThrowIfNullOrWhiteSpace(clientEntryId);
        ArgumentException.ThrowIfNullOrWhiteSpace(authorTimeZoneId);
        ArgumentException.ThrowIfNullOrWhiteSpace(text);
        if (text.Trim().Length > 5000) throw new ArgumentException("Entry text cannot exceed 5,000 characters.", nameof(text));

        return new DiaryEntry
        {
            AuthorUserId = authorUserId,
            ClientEntryId = clientEntryId.Trim(),
            AuthorLocalDate = authorLocalDate,
            AuthorTimeZoneId = authorTimeZoneId.Trim(),
            Text = text.Trim(),
            Mood = string.IsNullOrWhiteSpace(mood) ? null : mood.Trim(),
            PromptKey = string.IsNullOrWhiteSpace(promptKey) ? null : promptKey.Trim(),
        };
    }
}

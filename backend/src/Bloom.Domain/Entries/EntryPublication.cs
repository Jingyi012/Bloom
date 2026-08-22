using Bloom.Domain.Common;

namespace Bloom.Domain.Entries;

/// <summary>Immutable circle-specific publication of a diary entry.</summary>
public sealed class EntryPublication : AuditableEntity
{
    private EntryPublication()
    {
    }

    /// <summary>Gets the underlying diary entry identifier.</summary>
    public Guid DiaryEntryId { get; private set; }

    /// <summary>Gets the circle identifier receiving this publication.</summary>
    public Guid CircleId { get; private set; }

    /// <summary>Gets the author identifier duplicated for daily uniqueness and timeline queries.</summary>
    public Guid AuthorUserId { get; private set; }

    /// <summary>Gets the author's local date duplicated for daily uniqueness and timeline queries.</summary>
    public DateOnly AuthorLocalDate { get; private set; }

    /// <summary>Gets the publication submission instant.</summary>
    public DateTimeOffset SubmittedAtUtc { get; private set; }

    /// <summary>Gets the publication lifecycle status.</summary>
    public EntryPublicationStatus Status { get; private set; }

    /// <summary>Creates a sealed publication.</summary>
    public static EntryPublication Create(Guid diaryEntryId, Guid circleId, Guid authorUserId, DateOnly authorLocalDate, DateTimeOffset submittedAtUtc)
    {
        if (diaryEntryId == Guid.Empty) throw new ArgumentException("Diary entry is required.", nameof(diaryEntryId));
        if (circleId == Guid.Empty) throw new ArgumentException("Circle is required.", nameof(circleId));
        if (authorUserId == Guid.Empty) throw new ArgumentException("Author is required.", nameof(authorUserId));
        return new EntryPublication
        {
            DiaryEntryId = diaryEntryId,
            CircleId = circleId,
            AuthorUserId = authorUserId,
            AuthorLocalDate = authorLocalDate,
            SubmittedAtUtc = submittedAtUtc.ToUniversalTime(),
            Status = EntryPublicationStatus.Sealed,
        };
    }

    /// <summary>Withdraws this publication after the author leaves before bloom.</summary>
    public void Withdraw() => Status = EntryPublicationStatus.Withdrawn;
}

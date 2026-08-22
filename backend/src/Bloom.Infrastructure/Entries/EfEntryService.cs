using Bloom.Application.Auditing;
using Bloom.Application.Circles;
using Bloom.Application.Entries;
using Bloom.Domain.Circles;
using Bloom.Domain.Entries;
using Bloom.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bloom.Infrastructure.Entries;

/// <summary>Persists sealed text entries and circle publications in PostgreSQL.</summary>
public sealed class EfEntryService(
    BloomDbContext db,
    IAuditStampWriter auditStampWriter,
    TimeProvider timeProvider) : IEntryService
{
    private readonly BloomDbContext _db = db ?? throw new ArgumentNullException(nameof(db));
    private readonly IAuditStampWriter _auditStampWriter = auditStampWriter ?? throw new ArgumentNullException(nameof(auditStampWriter));
    private readonly TimeProvider _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));

    /// <inheritdoc />
    public async Task<EntrySubmissionResult> SubmitAsync(
        Guid authorUserId,
        string clientEntryId,
        DateOnly authorLocalDate,
        string authorTimeZoneId,
        string text,
        string? mood,
        string? promptKey,
        IReadOnlyCollection<Guid> circleIds,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(authorTimeZoneId);
        ArgumentException.ThrowIfNullOrWhiteSpace(text);
        if (circleIds is null || circleIds.Count is < 1 or > 12)
            throw new ArgumentException("Select between one and twelve circles.", nameof(circleIds));

        var distinctCircleIds = circleIds.Distinct().ToArray();
        if (distinctCircleIds.Length != circleIds.Count)
            throw new ArgumentException("Each circle may only be selected once.", nameof(circleIds));

        var existing = await _db.DiaryEntries.AsNoTracking()
            .SingleOrDefaultAsync(entry => entry.AuthorUserId == authorUserId && entry.ClientEntryId == clientEntryId.Trim(), cancellationToken)
            .ConfigureAwait(false);
        if (existing is not null)
        {
            var existingPublications = await _db.EntryPublications.AsNoTracking()
                .Where(publication => publication.DiaryEntryId == existing.Id && publication.Status == EntryPublicationStatus.Sealed)
                .OrderBy(publication => publication.CircleId)
                .ToArrayAsync(cancellationToken)
                .ConfigureAwait(false);
            return new EntrySubmissionResult(existing.Id, existingPublications.Select(publication => publication.Id).ToArray(), existingPublications.Select(publication => publication.CircleId).ToArray(), existing.AuthorLocalDate, existing.CreatedAtUtc);
        }

        var timeZone = FindTimeZone(authorTimeZoneId);
        var now = _timeProvider.GetUtcNow();
        var expectedLocalDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, timeZone).DateTime);
        if (authorLocalDate != expectedLocalDate)
            throw new InvalidOperationException("Entries must use today's date in the selected time zone.");

        var circles = await _db.Circles
            .Include(circle => circle.Members)
            .Where(circle => distinctCircleIds.Contains(circle.Id))
            .ToArrayAsync(cancellationToken)
            .ConfigureAwait(false);
        if (circles.Length != distinctCircleIds.Length)
            throw new KeyNotFoundException("One or more selected circles do not exist.");

        foreach (var circle in circles)
        {
            if (!circle.HasActiveMember(authorUserId))
                throw new UnauthorizedAccessException("You are not an active member of every selected circle.");
            if (circle.GetCurrentStatus(now) != CircleStatus.Sealed)
                throw new InvalidOperationException("Entries can only be submitted to sealed circles.");
        }

        var duplicateDay = await _db.EntryPublications.AnyAsync(publication =>
            distinctCircleIds.Contains(publication.CircleId)
            && publication.AuthorUserId == authorUserId
            && publication.AuthorLocalDate == authorLocalDate
            && publication.Status == EntryPublicationStatus.Sealed, cancellationToken).ConfigureAwait(false);
        if (duplicateDay)
            throw new InvalidOperationException("You already wrote today's entry to one of the selected circles.");

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken).ConfigureAwait(false);
        var diaryEntry = DiaryEntry.Create(authorUserId, clientEntryId, authorLocalDate, authorTimeZoneId, text, mood, promptKey);
        _auditStampWriter.StampCreated(diaryEntry, authorUserId);
        _db.DiaryEntries.Add(diaryEntry);

        var publications = new List<EntryPublication>(circles.Length);
        foreach (var circle in circles)
        {
            var publication = EntryPublication.Create(diaryEntry.Id, circle.Id, authorUserId, authorLocalDate, now);
            _auditStampWriter.StampCreated(publication, authorUserId);
            publications.Add(publication);
        }

        _db.EntryPublications.AddRange(publications);
        try
        {
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken).ConfigureAwait(false);
            throw new InvalidOperationException("Today's entry already exists. Refresh and try again.");
        }

        return new EntrySubmissionResult(diaryEntry.Id, publications.Select(publication => publication.Id).ToArray(), circles.Select(circle => circle.Id).ToArray(), authorLocalDate, now);
    }

    private static TimeZoneInfo FindTimeZone(string timeZoneId)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId.Trim());
        }
        catch (TimeZoneNotFoundException exception)
        {
            throw new ArgumentException("The selected time zone is not supported.", nameof(timeZoneId), exception);
        }
        catch (InvalidTimeZoneException exception)
        {
            throw new ArgumentException("The selected time zone is not supported.", nameof(timeZoneId), exception);
        }
    }
}

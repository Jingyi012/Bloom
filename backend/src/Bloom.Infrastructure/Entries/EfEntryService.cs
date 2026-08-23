using Bloom.Application.Auditing;
using Bloom.Application.Circles;
using Bloom.Application.Entries;
using Bloom.Application.Media;
using Bloom.Application.Security;
using Bloom.Domain.Circles;
using Bloom.Domain.Entries;
using Bloom.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;

namespace Bloom.Infrastructure.Entries;

/// <summary>Persists sealed text entries and circle publications in PostgreSQL.</summary>
public sealed class EfEntryService(
    BloomDbContext db,
    IAuditStampWriter auditStampWriter,
    TimeProvider timeProvider,
    IImageStorage imageStorage,
    IEntryProtector entryProtector) : IEntryService
{
    private static readonly HashSet<string> AllowedReactionCodes = ["❤️", "😊", "😂", "😢", "🔥", "👏"];
    private const int TimelineDayPageSize = 7;
    private const int CommentPageSize = 50;
    private readonly BloomDbContext _db = db ?? throw new ArgumentNullException(nameof(db));
    private readonly IAuditStampWriter _auditStampWriter = auditStampWriter ?? throw new ArgumentNullException(nameof(auditStampWriter));
    private readonly TimeProvider _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
    private readonly IImageStorage _imageStorage = imageStorage ?? throw new ArgumentNullException(nameof(imageStorage));
    private readonly IEntryProtector _entryProtector = entryProtector ?? throw new ArgumentNullException(nameof(entryProtector));

    /// <inheritdoc />
    public async Task<TodayEntryStatus> GetTodayStatusAsync(Guid userId, CancellationToken cancellationToken)
    {
        var context = await LoadTodayContextAsync(userId, cancellationToken).ConfigureAwait(false);
        if (context is null)
        {
            var user = await _db.Users.AsNoTracking().SingleAsync(candidate => candidate.Id == userId, cancellationToken).ConfigureAwait(false);
            var timeZone = FindTimeZone(user.TimeZoneId);
            var localDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(_timeProvider.GetUtcNow(), timeZone).DateTime);
            return new TodayEntryStatus(false, localDate, null, null, Array.Empty<Guid>(), Array.Empty<Guid>(), null, null, null, false, null);
        }

        var mediaIds = await _db.MediaAssets.AsNoTracking()
            .Where(media => media.DiaryEntryId == context.Entry.Id && media.DeletedAtUtc == null)
            .OrderBy(media => media.SortOrder)
            .Select(media => media.Id)
            .ToArrayAsync(cancellationToken)
            .ConfigureAwait(false);
        return new TodayEntryStatus(
            true,
            context.LocalDate,
            context.Entry.Id,
            context.Entry.CreatedAtUtc,
            context.Publications.Select(item => item.Publication.CircleId).OrderBy(id => id).ToArray(),
            mediaIds,
            context.CanModify ? _entryProtector.Unprotect(context.Entry.Text) : null,
            context.CanModify ? context.Entry.Mood : null,
            context.CanModify ? context.Entry.PromptKey : null,
            context.CanModify,
            context.ModificationEndsAtUtc);
    }

    /// <inheritdoc />
    public async Task<TodayEntryStatus> UpdateTodayAsync(Guid userId, string text, string? mood, string? promptKey, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(text);
        if (text.Trim().Length > 5000) throw new ArgumentException("Entry text cannot exceed 5,000 characters.", nameof(text));
        var context = await LoadTodayContextAsync(userId, cancellationToken).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Today's diary does not exist.");
        EnsureCanModify(context);
        context.Entry.Update(_entryProtector.Protect(text), mood, promptKey);
        _auditStampWriter.StampModified(context.Entry, userId);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return await GetTodayStatusAsync(userId, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<TodayEntryStatus> UpdateTodayWithMediaAsync(
        Guid userId,
        string text,
        string? mood,
        string? promptKey,
        IReadOnlyCollection<Guid> circleIds,
        IReadOnlyCollection<Guid> retainedMediaIds,
        IReadOnlyCollection<ImageUpload> images,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(text);
        if (text.Trim().Length > 5000) throw new ArgumentException("Entry text cannot exceed 5,000 characters.", nameof(text));
        ArgumentNullException.ThrowIfNull(retainedMediaIds);
        ArgumentNullException.ThrowIfNull(images);
        ArgumentNullException.ThrowIfNull(circleIds);
        var desiredCircleIds = circleIds.Distinct().ToArray();
        if (desiredCircleIds.Length is < 1 or > 12)
            throw new ArgumentException("Select between one and twelve circles.", nameof(circleIds));
        if (desiredCircleIds.Length != circleIds.Count)
            throw new ArgumentException("Each circle may only be selected once.", nameof(circleIds));
        if (retainedMediaIds.Count + images.Count > 10)
            throw new ArgumentException("You can attach up to 10 images.", nameof(images));

        var context = await LoadTodayContextAsync(userId, cancellationToken).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Today's diary does not exist.");
        EnsureCanModify(context);

        var existingCircleIds = context.Publications.Select(item => item.Publication.CircleId).ToHashSet();
        var addedCircleIds = desiredCircleIds.Where(id => !existingCircleIds.Contains(id)).ToArray();
        if (addedCircleIds.Length > 0)
        {
            var addedCircles = await _db.Circles.Include(circle => circle.Members)
                .Where(circle => addedCircleIds.Contains(circle.Id))
                .ToArrayAsync(cancellationToken)
                .ConfigureAwait(false);
            if (addedCircles.Length != addedCircleIds.Length)
                throw new KeyNotFoundException("One or more selected circles do not exist.");
            var now = _timeProvider.GetUtcNow();
            foreach (var circle in addedCircles)
            {
                if (!circle.HasActiveMember(userId))
                    throw new UnauthorizedAccessException("You are not an active member of every selected circle.");
                if (circle.GetCurrentStatus(now) != CircleStatus.Sealed)
                    throw new InvalidOperationException("New circles must still be sealed.");
                var publication = EntryPublication.Create(context.Entry.Id, circle.Id, userId, context.LocalDate, context.Entry.CreatedAtUtc);
                _auditStampWriter.StampCreated(publication, userId);
                _db.EntryPublications.Add(publication);
            }
        }
        var removedPublications = context.Publications
            .Where(item => !desiredCircleIds.Contains(item.Publication.CircleId))
            .Select(item => item.Publication)
            .ToArray();
        _db.EntryPublications.RemoveRange(removedPublications);

        var existingMedia = await _db.MediaAssets
            .Where(asset => asset.DiaryEntryId == context.Entry.Id && asset.DeletedAtUtc == null)
            .OrderBy(asset => asset.SortOrder)
            .ToArrayAsync(cancellationToken)
            .ConfigureAwait(false);
        var retained = retainedMediaIds.Distinct().ToHashSet();
        if (retained.Count != retainedMediaIds.Count)
            throw new ArgumentException("Media selection is invalid.", nameof(retainedMediaIds));
        if (retained.Any(id => existingMedia.All(asset => asset.Id != id)))
            throw new ArgumentException("Media selection is invalid.", nameof(retainedMediaIds));

        context.Entry.Update(_entryProtector.Protect(text), mood, promptKey);
        _auditStampWriter.StampModified(context.Entry, userId);

        var removed = existingMedia.Where(asset => !retained.Contains(asset.Id)).ToArray();
        _db.MediaAssets.RemoveRange(removed);
        var sortOrder = existingMedia.Where(asset => retained.Contains(asset.Id)).Select(asset => asset.SortOrder).DefaultIfEmpty(-1).Max() + 1;
        var storedImages = new List<StoredImage>();
        try
        {
            foreach (var image in images)
            {
                await using (image.Content.ConfigureAwait(false))
                {
                    var stored = await _imageStorage.SaveAsync(userId, image.Content, image.ContentType, cancellationToken).ConfigureAwait(false);
                    storedImages.Add(stored);
                    var asset = MediaAsset.Create(context.Entry.Id, sortOrder++, stored.RelativePath, stored.ContentType, stored.SizeBytes, stored.Sha256);
                    _auditStampWriter.StampCreated(asset, userId);
                    _db.MediaAssets.Add(asset);
                }
            }
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch
        {
            foreach (var stored in storedImages)
            {
                try { await _imageStorage.DeleteAsync(stored.RelativePath, cancellationToken).ConfigureAwait(false); }
                catch (FileNotFoundException) { }
            }
            throw;
        }

        foreach (var asset in removed)
        {
            try { await _imageStorage.DeleteAsync(asset.RelativePath, cancellationToken).ConfigureAwait(false); }
            catch (FileNotFoundException) { }
        }
        return await GetTodayStatusAsync(userId, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<bool> DeleteTodayAsync(Guid userId, CancellationToken cancellationToken)
    {
        var context = await LoadTodayContextAsync(userId, cancellationToken).ConfigureAwait(false);
        if (context is null) return false;
        EnsureCanModify(context);

        var media = await _db.MediaAssets
            .Where(asset => asset.DiaryEntryId == context.Entry.Id)
            .ToArrayAsync(cancellationToken)
            .ConfigureAwait(false);
        var publications = await _db.EntryPublications
            .Where(publication => publication.DiaryEntryId == context.Entry.Id)
            .ToArrayAsync(cancellationToken)
            .ConfigureAwait(false);
        _db.MediaAssets.RemoveRange(media);
        _db.EntryPublications.RemoveRange(publications);
        _db.DiaryEntries.Remove(context.Entry);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        foreach (var asset in media)
        {
            try { await _imageStorage.DeleteAsync(asset.RelativePath, cancellationToken).ConfigureAwait(false); }
            catch (FileNotFoundException) { }
        }
        return true;
    }

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
        if (text.Trim().Length > 5000) throw new ArgumentException("Entry text cannot exceed 5,000 characters.", nameof(text));
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

        var duplicateDay = await _db.DiaryEntries.AnyAsync(entry =>
            entry.AuthorUserId == authorUserId
            && entry.AuthorLocalDate == authorLocalDate
            && entry.DeletedAtUtc == null, cancellationToken).ConfigureAwait(false);
        if (duplicateDay)
            throw new InvalidOperationException("Today's diary is already sealed.");

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

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken).ConfigureAwait(false);
        var diaryEntry = DiaryEntry.Create(authorUserId, clientEntryId, authorLocalDate, authorTimeZoneId, _entryProtector.Protect(text), mood, promptKey);
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

    /// <inheritdoc />
    public async Task<EntrySubmissionResult> SubmitWithMediaAsync(
        Guid authorUserId,
        string clientEntryId,
        DateOnly authorLocalDate,
        string authorTimeZoneId,
        string text,
        string? mood,
        string? promptKey,
        IReadOnlyCollection<Guid> circleIds,
        IReadOnlyCollection<ImageUpload> images,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(images);
        if (images.Count == 0) throw new ArgumentException("At least one image is required.", nameof(images));
        if (images.Count > 10) throw new ArgumentException("You can attach up to 10 images.", nameof(images));
        var result = await SubmitAsync(authorUserId, clientEntryId, authorLocalDate, authorTimeZoneId, text, mood, promptKey, circleIds, cancellationToken).ConfigureAwait(false);
        if (await _db.MediaAssets.AnyAsync(media => media.DiaryEntryId == result.DiaryEntryId && media.DeletedAtUtc == null, cancellationToken).ConfigureAwait(false))
            return result;

        var storedImages = new List<StoredImage>();
        try
        {
            var sortOrder = 0;
            foreach (var image in images)
            {
                await using (image.Content.ConfigureAwait(false))
                {
                    var stored = await _imageStorage.SaveAsync(authorUserId, image.Content, image.ContentType, cancellationToken).ConfigureAwait(false);
                    storedImages.Add(stored);
                    var asset = MediaAsset.Create(result.DiaryEntryId, sortOrder, stored.RelativePath, stored.ContentType, stored.SizeBytes, stored.Sha256);
                    _auditStampWriter.StampCreated(asset, authorUserId);
                    _db.MediaAssets.Add(asset);
                }
                sortOrder++;
            }
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return result;
        }
        catch
        {
            foreach (var stored in storedImages) await _imageStorage.DeleteAsync(stored.RelativePath, cancellationToken).ConfigureAwait(false);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<TimelinePage> GetTimelineAsync(Guid userId, Guid circleId, string? cursor, DateOnly? date, Guid? authorUserId, CancellationToken cancellationToken)
    {
        var circle = await _db.Circles.AsNoTracking().Include(candidate => candidate.Members)
            .SingleOrDefaultAsync(candidate => candidate.Id == circleId, cancellationToken).ConfigureAwait(false);
        var member = circle?.Members.FirstOrDefault(candidate => candidate.UserId == userId && candidate.LeftAtUtc is null);
        if (circle is null || member is null) throw new KeyNotFoundException("circle_not_found");
        if (circle.GetCurrentStatus(_timeProvider.GetUtcNow()) != CircleStatus.Bloomed) throw new CircleNotBloomedException();

        var query = from publication in _db.EntryPublications.AsNoTracking()
                    join diaryEntry in _db.DiaryEntries.AsNoTracking() on publication.DiaryEntryId equals diaryEntry.Id
                    join author in _db.Users.AsNoTracking() on publication.AuthorUserId equals author.Id
                    where publication.CircleId == circleId
                        && publication.Status == EntryPublicationStatus.Sealed
                        && diaryEntry.CreatedAtUtc >= member.JoinedAtUtc
                    select new { publication, diaryEntry, author };

        if (date is not null) query = query.Where(item => item.publication.AuthorLocalDate == date.Value);
        if (authorUserId is not null) query = query.Where(item => item.publication.AuthorUserId == authorUserId.Value);
        var state = DecodeCursor<TimelineCursor>(cursor);
        var dayQuery = query.Select(item => item.publication.AuthorLocalDate).Distinct();
        if (state is not null) dayQuery = dayQuery.Where(day => day > state.Date);

        var pageDates = await dayQuery.OrderBy(day => day)
            .Take(TimelineDayPageSize + 1)
            .ToArrayAsync(cancellationToken).ConfigureAwait(false);
        var hasNext = pageDates.Length > TimelineDayPageSize;
        var selectedDates = pageDates.Take(TimelineDayPageSize).ToArray();
        if (selectedDates.Length == 0) return new TimelinePage([], null);

        var pageRows = await query
            .Where(item => selectedDates.Contains(item.publication.AuthorLocalDate))
            .OrderBy(item => item.publication.AuthorLocalDate)
            .ThenBy(item => item.publication.SubmittedAtUtc)
            .ThenBy(item => item.publication.Id)
            .ToArrayAsync(cancellationToken).ConfigureAwait(false);
        var entries = await ToTimelineEntriesAsync(pageRows, userId, cancellationToken).ConfigureAwait(false);
        var days = entries.GroupBy(entry => entry.AuthorLocalDate)
            .OrderBy(group => group.Key)
            .Select(group => new TimelineDay(group.Key, group.ToArray()))
            .ToArray();
        var nextCursor = hasNext && days.Length > 0
            ? EncodeCursor(new TimelineCursor(days[^1].Date))
            : null;
        return new TimelinePage(days, nextCursor);
    }

    /// <inheritdoc />
    public async Task<TimelineEntry> GetPublicationAsync(Guid userId, Guid publicationId, CancellationToken cancellationToken)
    {
        var row = await EnsureVisibleAsync(userId, publicationId, cancellationToken).ConfigureAwait(false);
        return (await ToTimelineEntriesAsync([row], userId, cancellationToken).ConfigureAwait(false))[0];
    }

    /// <inheritdoc />
    public async Task<ReactionSummary> AddReactionAsync(Guid userId, Guid publicationId, string emojiCode, CancellationToken cancellationToken)
    {
        var row = await EnsureVisibleAsync(userId, publicationId, cancellationToken).ConfigureAwait(false);
        var normalized = ValidateReaction(emojiCode);
        var existing = await _db.Reactions.SingleOrDefaultAsync(reaction => reaction.EntryPublicationId == publicationId && reaction.UserId == userId && reaction.EmojiCode == normalized, cancellationToken).ConfigureAwait(false);
        if (existing is null)
        {
            var reaction = Reaction.Create(publicationId, userId, normalized);
            _auditStampWriter.StampCreated(reaction, userId);
            _db.Reactions.Add(reaction);
            try
            {
                await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (DbUpdateException)
            {
                // Two taps from separate requests can race before either sees
                // the unique reaction row. Let the winner be authoritative and
                // make the losing request idempotent instead of returning 500.
                _db.Entry(reaction).State = EntityState.Detached;
                var concurrent = await _db.Reactions.AsNoTracking().AnyAsync(candidate =>
                    candidate.EntryPublicationId == publicationId
                    && candidate.UserId == userId
                    && candidate.EmojiCode == normalized
                    && candidate.DeletedAtUtc == null,
                    cancellationToken).ConfigureAwait(false);
                if (!concurrent) throw;
            }
        }
        else if (existing.DeletedAtUtc is not null)
        {
            // Reaction rows are audited, so restore the same row instead of
            // inserting a duplicate that would violate the unique key.
            existing.DeletedAtUtc = null;
            existing.DeletedByUserId = null;
            _auditStampWriter.StampModified(existing, userId);
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        return await GetReactionSummaryAsync(row.publication.Id, userId, normalized, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<ReactionSummary> RemoveReactionAsync(Guid userId, Guid publicationId, string emojiCode, CancellationToken cancellationToken)
    {
        var row = await EnsureVisibleAsync(userId, publicationId, cancellationToken).ConfigureAwait(false);
        var normalized = ValidateReaction(emojiCode);
        var existing = await _db.Reactions.SingleOrDefaultAsync(reaction => reaction.EntryPublicationId == publicationId && reaction.UserId == userId && reaction.EmojiCode == normalized, cancellationToken).ConfigureAwait(false);
        if (existing is not null)
        {
            _auditStampWriter.StampDeleted(existing, userId);
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        return await GetReactionSummaryAsync(row.publication.Id, userId, normalized, cancellationToken).ConfigureAwait(false);
    }

    /// <inheritdoc />
    public async Task<CommentPage> GetCommentsAsync(Guid userId, Guid publicationId, string? cursor, CancellationToken cancellationToken)
    {
        await EnsureVisibleAsync(userId, publicationId, cancellationToken).ConfigureAwait(false);
        var query = from comment in _db.Comments.AsNoTracking()
                    join author in _db.Users.AsNoTracking() on comment.AuthorUserId equals author.Id
                    where comment.EntryPublicationId == publicationId && comment.DeletedAtUtc == null && !comment.IsHidden
                    select new { comment, author };
        var state = DecodeCursor<CommentCursor>(cursor);
        if (state is not null)
        {
            query = query.Where(item => item.comment.CreatedAtUtc > state.CreatedAtUtc
                || (item.comment.CreatedAtUtc == state.CreatedAtUtc && item.comment.Id.CompareTo(state.CommentId) > 0));
        }
        var rows = await query.OrderBy(item => item.comment.CreatedAtUtc).ThenBy(item => item.comment.Id)
            .Take(CommentPageSize + 1).ToArrayAsync(cancellationToken).ConfigureAwait(false);
        var hasNext = rows.Length > CommentPageSize;
        var pageRows = rows.Take(CommentPageSize).ToArray();
        var comments = pageRows.Select(item => new CommentResult(item.comment.Id, item.comment.AuthorUserId, item.author.DisplayName, item.author.GoogleAvatarUrl, item.comment.Body, item.comment.CreatedAtUtc, item.comment.AuthorUserId == userId)).ToArray();
        var nextCursor = hasNext && pageRows.Length > 0 ? EncodeCursor(new CommentCursor(pageRows[^1].comment.CreatedAtUtc, pageRows[^1].comment.Id)) : null;
        return new CommentPage(comments, nextCursor);
    }

    /// <inheritdoc />
    public async Task<CommentResult> AddCommentAsync(Guid userId, Guid publicationId, string body, CancellationToken cancellationToken)
    {
        await EnsureVisibleAsync(userId, publicationId, cancellationToken).ConfigureAwait(false);
        var author = await _db.Users.AsNoTracking().SingleAsync(user => user.Id == userId, cancellationToken).ConfigureAwait(false);
        var comment = Comment.Create(publicationId, userId, body);
        _auditStampWriter.StampCreated(comment, userId);
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new CommentResult(comment.Id, userId, author.DisplayName, author.GoogleAvatarUrl, comment.Body, comment.CreatedAtUtc, true);
    }

    /// <inheritdoc />
    public async Task<bool> DeleteCommentAsync(Guid userId, Guid commentId, CancellationToken cancellationToken)
    {
        var comment = await _db.Comments.SingleOrDefaultAsync(candidate => candidate.Id == commentId && candidate.AuthorUserId == userId && candidate.DeletedAtUtc == null, cancellationToken).ConfigureAwait(false);
        if (comment is null) return false;
        await EnsureVisibleAsync(userId, comment.EntryPublicationId, cancellationToken).ConfigureAwait(false);
        _auditStampWriter.StampDeleted(comment, userId);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return true;
    }

    private async Task<TimelineEntry[]> ToTimelineEntriesAsync(dynamic[] rows, Guid userId, CancellationToken cancellationToken)
    {
        var publicationIds = rows.Select(row => (Guid)row.publication.Id).ToArray();
        var reactions = await _db.Reactions.AsNoTracking().Where(reaction => publicationIds.Contains(reaction.EntryPublicationId) && reaction.DeletedAtUtc == null)
            .GroupBy(reaction => new { reaction.EntryPublicationId, reaction.EmojiCode })
            .Select(group => new { group.Key.EntryPublicationId, group.Key.EmojiCode, Count = group.Count(), Reacted = group.Any(reaction => reaction.UserId == userId) })
            .ToArrayAsync(cancellationToken).ConfigureAwait(false);
        var commentCounts = await _db.Comments.AsNoTracking().Where(comment => publicationIds.Contains(comment.EntryPublicationId) && comment.DeletedAtUtc == null && !comment.IsHidden)
            .GroupBy(comment => comment.EntryPublicationId).Select(group => new { PublicationId = group.Key, Count = group.Count() }).ToDictionaryAsync(item => item.PublicationId, item => item.Count, cancellationToken).ConfigureAwait(false);
        var diaryEntryIds = rows.Select(row => (Guid)row.diaryEntry.Id).Distinct().ToArray();
        var mediaRows = await _db.MediaAssets.AsNoTracking().Where(media => diaryEntryIds.Contains(media.DiaryEntryId) && media.DeletedAtUtc == null)
            .OrderBy(media => media.SortOrder).Select(media => new { media.DiaryEntryId, media.Id, media.SortOrder }).ToArrayAsync(cancellationToken).ConfigureAwait(false);
        var mediaIds = mediaRows.GroupBy(media => media.DiaryEntryId).ToDictionary(group => group.Key, group => group.OrderBy(media => media.SortOrder).Select(media => media.Id).ToArray());
        return rows.Select(row => new TimelineEntry(
            row.publication.Id,
            row.diaryEntry.Id,
            row.author.Id,
            row.author.DisplayName,
            row.author.GoogleAvatarUrl,
            row.publication.AuthorLocalDate,
            row.publication.SubmittedAtUtc,
            _entryProtector.Unprotect(row.diaryEntry.Text),
            row.diaryEntry.Mood,
            mediaIds.TryGetValue((Guid)row.diaryEntry.Id, out var diaryMediaIds) ? diaryMediaIds : Array.Empty<Guid>(),
            reactions.Where(reaction => reaction.EntryPublicationId == row.publication.Id).Select(reaction => new ReactionSummary(reaction.EmojiCode, reaction.Count, reaction.Reacted)).ToArray(),
            (commentCounts.ContainsKey((Guid)row.publication.Id) ? commentCounts[(Guid)row.publication.Id] : 0))).ToArray();
    }

    private async Task<dynamic> EnsureVisibleAsync(Guid userId, Guid publicationId, CancellationToken cancellationToken)
    {
        var row = await (from publication in _db.EntryPublications.AsNoTracking()
                         join diaryEntry in _db.DiaryEntries.AsNoTracking() on publication.DiaryEntryId equals diaryEntry.Id
                         join circle in _db.Circles.AsNoTracking().Include(candidate => candidate.Members) on publication.CircleId equals circle.Id
                         select new { publication, diaryEntry, circle })
            .SingleOrDefaultAsync(item => item.publication.Id == publicationId, cancellationToken).ConfigureAwait(false);
        var member = row?.circle.Members.FirstOrDefault(candidate => candidate.UserId == userId && candidate.LeftAtUtc is null);
        if (row is null || member is null || row.publication.Status != EntryPublicationStatus.Sealed) throw new PublicationNotVisibleException();
        if (row.circle.GetCurrentStatus(_timeProvider.GetUtcNow()) != CircleStatus.Bloomed) throw new CircleNotBloomedException();
        if (row.diaryEntry.CreatedAtUtc < member.JoinedAtUtc) throw new PublicationNotVisibleException();
        return await (from publication in _db.EntryPublications.AsNoTracking()
                      join diaryEntry in _db.DiaryEntries.AsNoTracking() on publication.DiaryEntryId equals diaryEntry.Id
                      join author in _db.Users.AsNoTracking() on publication.AuthorUserId equals author.Id
                      where publication.Id == publicationId
                      select new { publication, diaryEntry, author }).SingleAsync(cancellationToken).ConfigureAwait(false);
    }

    private async Task<ReactionSummary> GetReactionSummaryAsync(Guid publicationId, Guid userId, string emojiCode, CancellationToken cancellationToken)
    {
        var reactions = await _db.Reactions.AsNoTracking().Where(reaction => reaction.EntryPublicationId == publicationId && reaction.EmojiCode == emojiCode && reaction.DeletedAtUtc == null).ToArrayAsync(cancellationToken).ConfigureAwait(false);
        return new ReactionSummary(emojiCode, reactions.Length, reactions.Any(reaction => reaction.UserId == userId));
    }

    private async Task<TodayEntryContext?> LoadTodayContextAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _db.Users.AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == userId && candidate.DeletedAtUtc == null, cancellationToken)
            .ConfigureAwait(false);
        if (user is null) throw new KeyNotFoundException("user_not_found");

        var now = _timeProvider.GetUtcNow();
        var timeZone = FindTimeZone(user.TimeZoneId);
        var localNow = TimeZoneInfo.ConvertTime(now, timeZone);
        var localDate = DateOnly.FromDateTime(localNow.DateTime);
        var nextLocalMidnight = localNow.Date.AddDays(1);
        var modificationEndsAtUtc = new DateTimeOffset(nextLocalMidnight, localNow.Offset).ToUniversalTime();
        var entry = await _db.DiaryEntries
            .SingleOrDefaultAsync(candidate => candidate.AuthorUserId == userId && candidate.AuthorLocalDate == localDate && candidate.DeletedAtUtc == null, cancellationToken)
            .ConfigureAwait(false);
        if (entry is null) return null;

        var publications = await (from publication in _db.EntryPublications
                                  join circle in _db.Circles on publication.CircleId equals circle.Id
                                  where publication.DiaryEntryId == entry.Id && publication.DeletedAtUtc == null
                                  select new EditablePublication(publication, circle))
            .ToArrayAsync(cancellationToken)
            .ConfigureAwait(false);
        // A diary belongs to the author's local calendar day. Its edit window
        // is independent of later circle membership or bloom state: joining a
        // new circle must not make an already-written diary unexpectedly
        // disappear from the editor. Once the author's next local midnight
        // passes, the entry becomes immutable.
        var canModify = now < modificationEndsAtUtc;
        return new TodayEntryContext(entry, localDate, modificationEndsAtUtc, canModify, publications);
    }

    private static void EnsureCanModify(TodayEntryContext context)
    {
        if (!context.CanModify) throw new InvalidOperationException("Today's diary can no longer be changed.");
    }

    private static string ValidateReaction(string emojiCode)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(emojiCode);
        var normalized = emojiCode.Trim();
        if (!AllowedReactionCodes.Contains(normalized)) throw new ArgumentException("That reaction is not supported.", nameof(emojiCode));
        return normalized;
    }

    private static T? DecodeCursor<T>(string? cursor)
    {
        if (string.IsNullOrWhiteSpace(cursor)) return default;
        try { return JsonSerializer.Deserialize<T>(Encoding.UTF8.GetString(Convert.FromBase64String(cursor))); }
        catch (FormatException) { throw new ArgumentException("The cursor is invalid.", nameof(cursor)); }
        catch (JsonException) { throw new ArgumentException("The cursor is invalid.", nameof(cursor)); }
    }

    private static string EncodeCursor<T>(T cursor) => Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(cursor)));

    private sealed record TimelineCursor(DateOnly Date);
    private sealed record CommentCursor(DateTimeOffset CreatedAtUtc, Guid CommentId);
    private sealed record EditablePublication(EntryPublication Publication, Circle Circle);
    private sealed record TodayEntryContext(DiaryEntry Entry, DateOnly LocalDate, DateTimeOffset ModificationEndsAtUtc, bool CanModify, IReadOnlyList<EditablePublication> Publications);

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

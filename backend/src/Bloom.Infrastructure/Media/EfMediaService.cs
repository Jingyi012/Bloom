using Bloom.Application.Entries;
using Bloom.Application.Media;
using Bloom.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bloom.Infrastructure.Media;

/// <summary>Authorizes and reads media attached to bloomed diary entries.</summary>
public sealed class EfMediaService(BloomDbContext db, IEntryService entryService, IImageStorage imageStorage) : IMediaService
{
    private readonly BloomDbContext _db = db ?? throw new ArgumentNullException(nameof(db));
    private readonly IEntryService _entryService = entryService ?? throw new ArgumentNullException(nameof(entryService));
    private readonly IImageStorage _imageStorage = imageStorage ?? throw new ArgumentNullException(nameof(imageStorage));

    /// <inheritdoc />
    public async Task<MediaContent?> GetContentAsync(Guid userId, Guid mediaId, CancellationToken cancellationToken)
    {
        // One upload belongs to the diary entry and is visible through any of that
        // entry's circle publications. Authorize the asset when any publication is visible.
        var asset = await _db.MediaAssets.AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId && candidate.DeletedAtUtc == null, cancellationToken)
            .ConfigureAwait(false);
        if (asset is null) return null;

        // Authors may preview and edit their own attachments before the circle
        // blooms. Other users must still go through the normal publication gate.
        var isAuthor = await _db.DiaryEntries.AsNoTracking()
            .AnyAsync(entry => entry.Id == asset.DiaryEntryId && entry.AuthorUserId == userId && entry.DeletedAtUtc == null, cancellationToken)
            .ConfigureAwait(false);
        if (isAuthor)
        {
            return new MediaContent(await _imageStorage.ReadAsync(asset.RelativePath, cancellationToken).ConfigureAwait(false), asset.ContentType);
        }

        var publicationIds = await _db.EntryPublications.AsNoTracking()
            .Where(candidate => candidate.DiaryEntryId == asset.DiaryEntryId)
            .Select(candidate => candidate.Id)
            .Distinct()
            .ToArrayAsync(cancellationToken)
            .ConfigureAwait(false);
        if (publicationIds.Length == 0) return null;

        CircleNotBloomedException? locked = null;
        PublicationNotVisibleException? hidden = null;
        var authorized = false;
        foreach (var publicationId in publicationIds)
        {
            try
            {
                await _entryService.GetPublicationAsync(userId, publicationId, cancellationToken).ConfigureAwait(false);
                authorized = true;
                break;
            }
            catch (CircleNotBloomedException exception)
            {
                locked ??= exception;
            }
            catch (PublicationNotVisibleException exception)
            {
                hidden ??= exception;
            }
        }

        if (!authorized)
        {
            // Preserve the locked response when at least one linked publication is
            // still sealed; otherwise report that the publication is not visible.
            if (locked is not null) throw locked;
            if (hidden is not null) throw hidden;
            return null;
        }

        return new MediaContent(await _imageStorage.ReadAsync(asset.RelativePath, cancellationToken).ConfigureAwait(false), asset.ContentType);
    }
}

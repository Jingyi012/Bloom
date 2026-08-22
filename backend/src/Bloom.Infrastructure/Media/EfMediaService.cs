using Bloom.Application.Entries;
using Bloom.Application.Media;
using Bloom.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bloom.Infrastructure.Media;

/// <summary>Authorizes and reads media linked to bloomed publications.</summary>
public sealed class EfMediaService(BloomDbContext db, IEntryService entryService, IImageStorage imageStorage) : IMediaService
{
    private readonly BloomDbContext _db = db ?? throw new ArgumentNullException(nameof(db));
    private readonly IEntryService _entryService = entryService ?? throw new ArgumentNullException(nameof(entryService));
    private readonly IImageStorage _imageStorage = imageStorage ?? throw new ArgumentNullException(nameof(imageStorage));

    /// <inheritdoc />
    public async Task<MediaContent?> GetContentAsync(Guid userId, Guid mediaId, CancellationToken cancellationToken)
    {
        // One upload is shared by every publication created for the selected circles.
        // Therefore a media asset can have multiple active links; requiring a single
        // link causes valid multi-circle entries to fail with Sequence contains more
        // than one element. Authorize the asset when any linked publication is visible.
        var publicationIds = await _db.EntryMedia.AsNoTracking()
            .Where(candidate => candidate.MediaAssetId == mediaId && candidate.DeletedAtUtc == null)
            .Select(candidate => candidate.EntryPublicationId)
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

        var asset = await _db.MediaAssets.AsNoTracking().SingleOrDefaultAsync(candidate => candidate.Id == mediaId && candidate.DeletedAtUtc == null, cancellationToken).ConfigureAwait(false);
        if (asset is null) return null;
        return new MediaContent(await _imageStorage.ReadAsync(asset.RelativePath, cancellationToken).ConfigureAwait(false), asset.ContentType);
    }
}

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
        var link = await _db.EntryMedia.AsNoTracking().SingleOrDefaultAsync(candidate => candidate.MediaAssetId == mediaId && candidate.DeletedAtUtc == null, cancellationToken).ConfigureAwait(false);
        if (link is null) return null;
        await _entryService.GetPublicationAsync(userId, link.EntryPublicationId, cancellationToken).ConfigureAwait(false);
        var asset = await _db.MediaAssets.AsNoTracking().SingleOrDefaultAsync(candidate => candidate.Id == mediaId && candidate.DeletedAtUtc == null, cancellationToken).ConfigureAwait(false);
        if (asset is null) return null;
        return new MediaContent(await _imageStorage.ReadAsync(asset.RelativePath, cancellationToken).ConfigureAwait(false), asset.ContentType);
    }
}

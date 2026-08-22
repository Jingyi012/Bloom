using Bloom.Domain.Common;

namespace Bloom.Domain.Entries;

/// <summary>Links one media asset to an immutable entry publication.</summary>
public sealed class EntryMedia : AuditableEntity
{
    private EntryMedia()
    {
    }

    /// <summary>Gets the publication identifier.</summary>
    public Guid EntryPublicationId { get; private set; }

    /// <summary>Gets the media asset identifier.</summary>
    public Guid MediaAssetId { get; private set; }

    /// <summary>Gets the display order.</summary>
    public int SortOrder { get; private set; }

    /// <summary>Creates an entry-media link.</summary>
    public static EntryMedia Create(Guid entryPublicationId, Guid mediaAssetId, int sortOrder = 0)
    {
        if (entryPublicationId == Guid.Empty) throw new ArgumentException("Publication is required.", nameof(entryPublicationId));
        if (mediaAssetId == Guid.Empty) throw new ArgumentException("Media asset is required.", nameof(mediaAssetId));
        if (sortOrder < 0) throw new ArgumentOutOfRangeException(nameof(sortOrder));
        return new EntryMedia { EntryPublicationId = entryPublicationId, MediaAssetId = mediaAssetId, SortOrder = sortOrder };
    }
}

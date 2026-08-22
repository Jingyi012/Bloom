using Bloom.Domain.Common;

namespace Bloom.Domain.Entries;

/// <summary>Metadata for an encrypted project-local media file.</summary>
public sealed class MediaAsset : AuditableEntity
{
    private MediaAsset()
    {
    }

    /// <summary>Gets the diary entry that owns this media asset.</summary>
    public Guid DiaryEntryId { get; private set; }

    /// <summary>Gets the display order within the diary entry.</summary>
    public int SortOrder { get; private set; }

    /// <summary>Gets the generated relative storage key.</summary>
    public string RelativePath { get; private set; } = string.Empty;

    /// <summary>Gets the safe content type.</summary>
    public string ContentType { get; private set; } = string.Empty;

    /// <summary>Gets the encrypted file size in bytes.</summary>
    public long SizeBytes { get; private set; }

    /// <summary>Gets the SHA-256 digest of the protected payload.</summary>
    public string Sha256 { get; private set; } = string.Empty;

    /// <summary>Creates media metadata owned by a diary entry.</summary>
    public static MediaAsset Create(Guid diaryEntryId, int sortOrder, string relativePath, string contentType, long sizeBytes, string sha256)
    {
        if (diaryEntryId == Guid.Empty) throw new ArgumentException("Diary entry is required.", nameof(diaryEntryId));
        if (sortOrder < 0) throw new ArgumentOutOfRangeException(nameof(sortOrder));
        ArgumentException.ThrowIfNullOrWhiteSpace(relativePath);
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);
        ArgumentException.ThrowIfNullOrWhiteSpace(sha256);
        if (sizeBytes <= 0) throw new ArgumentOutOfRangeException(nameof(sizeBytes));
        return new MediaAsset { DiaryEntryId = diaryEntryId, SortOrder = sortOrder, RelativePath = relativePath, ContentType = contentType, SizeBytes = sizeBytes, Sha256 = sha256 };
    }
}

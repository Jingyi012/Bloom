using Bloom.Domain.Common;

namespace Bloom.Domain.Entries;

/// <summary>Metadata for an encrypted project-local media file.</summary>
public sealed class MediaAsset : AuditableEntity
{
    private MediaAsset()
    {
    }

    /// <summary>Gets the owning user.</summary>
    public Guid OwnerUserId { get; private set; }

    /// <summary>Gets the generated relative storage key.</summary>
    public string RelativePath { get; private set; } = string.Empty;

    /// <summary>Gets the safe content type.</summary>
    public string ContentType { get; private set; } = string.Empty;

    /// <summary>Gets the encrypted file size in bytes.</summary>
    public long SizeBytes { get; private set; }

    /// <summary>Gets the SHA-256 digest of the protected payload.</summary>
    public string Sha256 { get; private set; } = string.Empty;

    /// <summary>Creates media metadata.</summary>
    public static MediaAsset Create(Guid ownerUserId, string relativePath, string contentType, long sizeBytes, string sha256)
    {
        if (ownerUserId == Guid.Empty) throw new ArgumentException("Owner is required.", nameof(ownerUserId));
        ArgumentException.ThrowIfNullOrWhiteSpace(relativePath);
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);
        ArgumentException.ThrowIfNullOrWhiteSpace(sha256);
        if (sizeBytes <= 0) throw new ArgumentOutOfRangeException(nameof(sizeBytes));
        return new MediaAsset { OwnerUserId = ownerUserId, RelativePath = relativePath, ContentType = contentType, SizeBytes = sizeBytes, Sha256 = sha256 };
    }
}

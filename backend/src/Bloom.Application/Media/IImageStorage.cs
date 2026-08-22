namespace Bloom.Application.Media;

/// <summary>Stores encrypted image bytes outside the database.</summary>
public interface IImageStorage
{
    /// <summary>Saves an image and returns generated storage metadata.</summary>
    Task<StoredImage> SaveAsync(Guid ownerUserId, Stream content, string contentType, CancellationToken cancellationToken);

    /// <summary>Reads and decrypts an image by its generated relative path.</summary>
    Task<byte[]> ReadAsync(string relativePath, CancellationToken cancellationToken);

    /// <summary>Deletes an image if it exists.</summary>
    Task DeleteAsync(string relativePath, CancellationToken cancellationToken);
}

/// <summary>Metadata returned by local image storage.</summary>
public sealed record StoredImage(string RelativePath, string ContentType, long SizeBytes, string Sha256);

/// <summary>Image upload data passed from the HTTP boundary.</summary>
public sealed record ImageUpload(Stream Content, string ContentType);

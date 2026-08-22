namespace Bloom.Application.Media;

/// <summary>Authorizes access to entry media.</summary>
public interface IMediaService
{
    /// <summary>Reads media only after the publication's bloom authorization succeeds.</summary>
    Task<MediaContent?> GetContentAsync(Guid userId, Guid mediaId, CancellationToken cancellationToken);
}

/// <summary>Decrypted media content ready for an HTTP response.</summary>
public sealed record MediaContent(byte[] Bytes, string ContentType);

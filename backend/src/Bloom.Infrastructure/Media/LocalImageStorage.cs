using System.Security.Cryptography;
using System.Text;
using Bloom.Application.Media;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;

namespace Bloom.Infrastructure.Media;

/// <summary>Stores protected image bytes beneath the configured image-storage root.</summary>
public sealed class LocalImageStorage(
    IOptions<ImageStorageOptions> options,
    IDataProtectionProvider dataProtectionProvider,
    TimeProvider timeProvider) : IImageStorage
{
    private static readonly HashSet<string> AllowedContentTypes = ["image/jpeg", "image/png", "image/webp"];
    private readonly ImageStorageOptions _options = GetOptions(options);
    private readonly IDataProtector _protector = (dataProtectionProvider ?? throw new ArgumentNullException(nameof(dataProtectionProvider))).CreateProtector("Bloom.Images.v1");
    private readonly TimeProvider _timeProvider = timeProvider ?? throw new ArgumentNullException(nameof(timeProvider));
    private readonly string _rootPath = ResolveRootPath(GetOptions(options).RootPath);

    /// <inheritdoc />
    public async Task<StoredImage> SaveAsync(Guid ownerUserId, Stream content, string contentType, CancellationToken cancellationToken)
    {
        if (ownerUserId == Guid.Empty) throw new ArgumentException("Owner is required.", nameof(ownerUserId));
        ArgumentNullException.ThrowIfNull(content);
        if (!AllowedContentTypes.Contains(contentType)) throw new ArgumentException("Only JPEG, PNG, and WebP images are supported.", nameof(contentType));
        await using var memory = new MemoryStream();
        await content.CopyToAsync(memory, cancellationToken).ConfigureAwait(false);
        if (memory.Length == 0 || memory.Length > _options.MaxBytes) throw new InvalidOperationException("The image is empty or too large.");
        var bytes = memory.ToArray();
        ValidateSignature(bytes, contentType);
        var protectedBytes = _protector.Protect(bytes);
        var now = _timeProvider.GetUtcNow();
        var mediaId = Guid.NewGuid();
        var relativePath = Path.Combine(ownerUserId.ToString("N"), now.Year.ToString(), now.Month.ToString("00"), $"{mediaId:N}.bin").Replace('\\', '/');
        var fullPath = GetSafePath(relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        var temporaryPath = $"{fullPath}.{Guid.NewGuid():N}.tmp";
        await File.WriteAllBytesAsync(temporaryPath, protectedBytes, cancellationToken).ConfigureAwait(false);
        File.Move(temporaryPath, fullPath);
        var digest = Convert.ToHexString(SHA256.HashData(protectedBytes));
        return new StoredImage(relativePath, contentType, protectedBytes.LongLength, digest);
    }

    /// <inheritdoc />
    public async Task<byte[]> ReadAsync(string relativePath, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(relativePath);
        var protectedBytes = await File.ReadAllBytesAsync(GetSafePath(relativePath), cancellationToken).ConfigureAwait(false);
        return _protector.Unprotect(protectedBytes);
    }

    /// <inheritdoc />
    public Task DeleteAsync(string relativePath, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(relativePath);
        var path = GetSafePath(relativePath);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }

    private string GetSafePath(string relativePath)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_rootPath, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var relative = Path.GetRelativePath(_rootPath, fullPath);
        if (Path.IsPathRooted(relative)
            || relative == ".."
            || relative.StartsWith($"..{Path.DirectorySeparatorChar}", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("The media path is invalid.");
        }
        return fullPath;
    }

    private static string ResolveRootPath(string rootPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(rootPath);
        var resolved = Path.GetFullPath(rootPath);
        Directory.CreateDirectory(resolved);
        return Path.TrimEndingDirectorySeparator(resolved);
    }

    private static ImageStorageOptions GetOptions(IOptions<ImageStorageOptions>? options)
        => options?.Value ?? throw new ArgumentNullException(nameof(options));

    private static void ValidateSignature(byte[] bytes, string contentType)
    {
        var valid = contentType switch
        {
            "image/jpeg" => bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,
            "image/png" => bytes.Length >= 8 && bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            "image/webp" => bytes.Length >= 12 && Encoding.ASCII.GetString(bytes, 0, 4) == "RIFF" && Encoding.ASCII.GetString(bytes, 8, 4) == "WEBP",
            _ => false,
        };
        if (!valid) throw new InvalidOperationException("The image content does not match its declared type.");
    }
}

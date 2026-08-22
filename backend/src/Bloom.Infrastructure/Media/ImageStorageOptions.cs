namespace Bloom.Infrastructure.Media;

/// <summary>Validated local image-storage settings.</summary>
public sealed class ImageStorageOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "ImageStorage";

    /// <summary>Root folder for encrypted image files.</summary>
    public string RootPath { get; set; } = "App_Data/uploads";

    /// <summary>Maximum unencrypted upload size.</summary>
    public long MaxBytes { get; set; } = 10 * 1024 * 1024;
}

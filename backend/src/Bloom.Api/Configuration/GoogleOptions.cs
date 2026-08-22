using System.ComponentModel.DataAnnotations;

namespace Bloom.Api.Configuration;

/// <summary>Configuration required to validate Google identity tokens.</summary>
public sealed class GoogleOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Google";

    /// <summary>Gets or sets the legacy/default Google client identifier.</summary>
    [Required]
    public string ClientId { get; set; } = string.Empty;

    /// <summary>Gets or sets the iOS OAuth client identifier.</summary>
    public string IosClientId { get; set; } = string.Empty;

    /// <summary>Gets or sets the Android OAuth client identifier.</summary>
    public string AndroidClientId { get; set; } = string.Empty;

    /// <summary>Gets or sets the optional web OAuth client identifier.</summary>
    public string WebClientId { get; set; } = string.Empty;
}

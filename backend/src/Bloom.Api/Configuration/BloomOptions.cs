using System.ComponentModel.DataAnnotations;

namespace Bloom.Api.Configuration;

/// <summary>Configuration for Bloom application sessions.</summary>
public sealed class BloomOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Bloom";

    /// <summary>Gets or sets the issuer written into Bloom access tokens.</summary>
    [Required]
    public string SessionIssuer { get; set; } = "Bloom.Api";

    /// <summary>Gets or sets the symmetric signing secret.</summary>
    [Required, MinLength(32)]
    public string SessionSigningKey { get; set; } = string.Empty;

    /// <summary>Gets or sets the access-token lifetime in minutes.</summary>
    [Range(1, 60)]
    public int AccessTokenMinutes { get; set; } = 15;

    /// <summary>Gets or sets the refresh-token lifetime in days.</summary>
    [Range(1, 365)]
    public int RefreshTokenDays { get; set; } = 30;

    /// <summary>Gets or sets whether pending EF migrations are applied during startup.</summary>
    public bool ApplyMigrationsOnStartup { get; set; }
}

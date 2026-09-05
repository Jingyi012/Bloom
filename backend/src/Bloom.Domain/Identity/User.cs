using Bloom.Domain.Common;

namespace Bloom.Domain.Identity;

/// <summary>
/// Represents a Bloom user provisioned from a verified Google identity.
/// </summary>
public sealed class User : AuditableEntity
{
    private User()
    {
    }

    /// <summary>Gets Google's immutable subject identifier.</summary>
    public string GoogleSubject { get; private set; } = string.Empty;

    /// <summary>Gets the verified email returned by Google.</summary>
    public string Email { get; private set; } = string.Empty;

    /// <summary>Gets the normalized email used for case-insensitive lookups.</summary>
    public string EmailNormalized { get; private set; } = string.Empty;

    /// <summary>Gets whether the provider verified the email claim.</summary>
    public bool EmailVerified { get; private set; }

    /// <summary>Gets the display name shown in Bloom.</summary>
    public string DisplayName { get; private set; } = string.Empty;

    /// <summary>Gets the optional Google avatar URL.</summary>
    public string? GoogleAvatarUrl { get; private set; }

    /// <summary>Gets the optional Bloom-managed avatar path.</summary>
    public string? AvatarPath { get; private set; }

    /// <summary>Gets the content type of the Bloom-managed avatar.</summary>
    public string? AvatarContentType { get; private set; }

    /// <summary>Gets the user's IANA time-zone identifier.</summary>
    public string TimeZoneId { get; private set; } = "Asia/Kuala_Lumpur";

    /// <summary>Creates a local user from a validated Google identity.</summary>
    /// <param name="googleSubject">The immutable Google subject claim.</param>
    /// <param name="email">The verified email claim.</param>
    /// <param name="emailVerified">Whether Google verified the email.</param>
    /// <param name="displayName">The provider display name.</param>
    /// <param name="avatarUrl">The optional provider avatar URL.</param>
    /// <param name="timeZoneId">The user's initial IANA time-zone identifier.</param>
    /// <returns>A new user aggregate.</returns>
    public static User CreateFromGoogle(
        string googleSubject,
        string email,
        bool emailVerified,
        string displayName,
        string? avatarUrl,
        string timeZoneId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(googleSubject);
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        ArgumentException.ThrowIfNullOrWhiteSpace(displayName);
        ArgumentException.ThrowIfNullOrWhiteSpace(timeZoneId);

        return new User
        {
            GoogleSubject = googleSubject,
            Email = email,
            EmailNormalized = email.Trim().ToUpperInvariant(),
            EmailVerified = emailVerified,
            DisplayName = displayName,
            GoogleAvatarUrl = avatarUrl,
            TimeZoneId = timeZoneId,
        };
    }

    /// <summary>Updates profile fields that are safe for the user to edit.</summary>
    /// <param name="displayName">The new display name.</param>
    /// <param name="timeZoneId">The new IANA time-zone identifier.</param>
    public void UpdateProfile(string displayName, string timeZoneId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(displayName);
        ArgumentException.ThrowIfNullOrWhiteSpace(timeZoneId);

        DisplayName = displayName.Trim();
        TimeZoneId = timeZoneId.Trim();
    }

    /// <summary>Replaces the user's Bloom-managed avatar.</summary>
    public void UpdateAvatar(string relativePath, string contentType)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(relativePath);
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);
        AvatarPath = relativePath.Trim();
        AvatarContentType = contentType.Trim();
    }

    /// <summary>Gets the API-relative avatar reference, falling back to Google's avatar.</summary>
    public string? GetAvatarReference() => AvatarPath is null ? GoogleAvatarUrl : $"users/{Id:D}/avatar";
}

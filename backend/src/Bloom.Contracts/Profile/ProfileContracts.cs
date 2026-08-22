namespace Bloom.Contracts.Profile;

/// <summary>Safe profile data returned to the signed-in mobile client.</summary>
public sealed record CurrentUserResponse(
    Guid Id,
    string DisplayName,
    string Email,
    string? AvatarUrl,
    string TimeZoneId);

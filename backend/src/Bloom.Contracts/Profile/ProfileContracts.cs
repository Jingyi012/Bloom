namespace Bloom.Contracts.Profile;

/// <summary>Safe profile data returned to the signed-in mobile client.</summary>
public sealed record CurrentUserResponse(
    Guid Id,
    string DisplayName,
    string Email,
    string? AvatarUrl,
    string TimeZoneId);

/// <summary>Request to update safe profile fields.</summary>
public sealed record UpdateProfileRequest(string DisplayName, string TimeZoneId);

/// <summary>Profile statistics that do not reveal sealed content.</summary>
public sealed record UserStatsResponse(int TotalEntries, int ActiveCircles, int BloomedCircles, int CurrentStreak);

/// <summary>Safe record of a previously connected friend.</summary>
public sealed record FriendResponse(Guid UserId, string DisplayName, string Email, string? AvatarUrl, DateTimeOffset LastSeenAtUtc);

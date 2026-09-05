namespace Bloom.Contracts.Circles;

/// <summary>Request to plant a sealed circle at a creator-selected instant.</summary>
public sealed record CreateCircleRequest(
    string Name,
    string Emoji,
    DateTimeOffset? BloomAtUtc,
    string TimeZoneId,
    int? DurationMonths = null);

/// <summary>Request to update creator-controlled circle details before bloom.</summary>
public sealed record UpdateCircleRequest(
    string Name,
    string Emoji,
    DateTimeOffset BloomAtUtc,
    string TimeZoneId);

/// <summary>Describes whether a circle was deleted or archived.</summary>
public sealed record CircleDeleteResponse(bool WasArchived);

/// <summary>Request to invite an existing Bloom user.</summary>
public sealed record InviteCircleMemberRequest(string Email);

/// <summary>Request to accept or decline an invitation.</summary>
public sealed record RespondToInvitationRequest(bool Accept);

/// <summary>Safe circle member information.</summary>
public sealed record CircleMemberResponse(
    Guid UserId,
    string DisplayName,
    string? AvatarUrl,
    string Role,
    DateTimeOffset JoinedAtUtc,
    bool IsActive);

/// <summary>Safe circle summary information.</summary>
public sealed record CircleSummaryResponse(
    Guid Id,
    string Name,
    string Emoji,
    string Status,
    DateTimeOffset BloomAtUtc,
    string TimeZoneId,
    int MemberCount,
    bool IsCreator,
    bool CanLeave,
    bool IsArchivedForCurrentUser);

/// <summary>Circle details and active members.</summary>
public sealed record CircleDetailResponse(
    CircleSummaryResponse Circle,
    IReadOnlyList<CircleMemberResponse> Members);

/// <summary>Pending invitation information.</summary>
public sealed record CircleInvitationResponse(
    Guid Id,
    Guid CircleId,
    string CircleName,
    string CircleEmoji,
    DateTimeOffset CreatedAtUtc);

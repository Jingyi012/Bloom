using Bloom.Domain.Common;

namespace Bloom.Domain.Circles;

/// <summary>Join entity connecting a user to a circle.</summary>
public sealed class CircleMember : AuditableEntity
{
    private CircleMember()
    {
    }

    /// <summary>Gets the circle identifier.</summary>
    public Guid CircleId { get; private set; }

    /// <summary>Gets the member user identifier.</summary>
    public Guid UserId { get; private set; }

    /// <summary>Gets the member role.</summary>
    public CircleMemberRole Role { get; private set; }

    /// <summary>Gets the membership start instant.</summary>
    public DateTimeOffset JoinedAtUtc { get; private set; }

    /// <summary>Gets the departure instant, when the member has left.</summary>
    public DateTimeOffset? LeftAtUtc { get; private set; }

    internal static CircleMember Create(Guid circleId, Guid userId, CircleMemberRole role, DateTimeOffset joinedAtUtc) => new()
    {
        CircleId = circleId,
        UserId = userId,
        Role = role,
        JoinedAtUtc = joinedAtUtc.ToUniversalTime(),
    };

    internal void Leave(DateTimeOffset leftAtUtc) => LeftAtUtc = leftAtUtc.ToUniversalTime();
}

using Bloom.Domain.Circles;

namespace Bloom.Application.Circles;

/// <summary>Coordinates circle creation, membership, and invitations.</summary>
public interface ICircleService
{
    /// <summary>Creates a sealed circle with the creator as its first member.</summary>
    Task<Circle> CreateAsync(Guid creatorUserId, string name, string emoji, DateTimeOffset bloomAtUtc, string timeZoneId, CancellationToken cancellationToken);

    /// <summary>Updates creator-controlled details for a circle that has not bloomed.</summary>
    Task<Circle?> UpdateAsync(Guid circleId, Guid userId, string name, string emoji, DateTimeOffset bloomAtUtc, string timeZoneId, CancellationToken cancellationToken);

    /// <summary>Lists circles in which the user is an active member.</summary>
    Task<IReadOnlyList<Circle>> ListForUserAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Gets a circle when the user is an active member.</summary>
    Task<Circle?> GetForUserAsync(Guid circleId, Guid userId, CancellationToken cancellationToken);

    /// <summary>Gets a circle by identifier for invitation previews.</summary>
    Task<Circle?> GetByIdAsync(Guid circleId, CancellationToken cancellationToken);

    /// <summary>Invites an existing Bloom user by email.</summary>
    Task<CircleInvitation> InviteAsync(Guid circleId, Guid inviterUserId, string inviteeEmail, CancellationToken cancellationToken);

    /// <summary>Lists pending invitations for a user.</summary>
    Task<IReadOnlyList<CircleInvitation>> ListInvitationsAsync(Guid inviteeUserId, CancellationToken cancellationToken);

    /// <summary>Accepts or declines a pending invitation.</summary>
    Task<bool> RespondToInvitationAsync(Guid invitationId, Guid inviteeUserId, bool accept, CancellationToken cancellationToken);

    /// <summary>Leaves a circle and withdraws future access.</summary>
    Task<bool> LeaveAsync(Guid circleId, Guid userId, CancellationToken cancellationToken);
}

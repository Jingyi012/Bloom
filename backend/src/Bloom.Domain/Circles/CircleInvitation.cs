using Bloom.Domain.Common;

namespace Bloom.Domain.Circles;

/// <summary>Invitation from a circle member to an existing Bloom user.</summary>
public sealed class CircleInvitation : AuditableEntity
{
    private CircleInvitation()
    {
    }

    /// <summary>Gets the circle identifier.</summary>
    public Guid CircleId { get; private set; }

    /// <summary>Gets the inviting user identifier.</summary>
    public Guid InviterUserId { get; private set; }

    /// <summary>Gets the invited user identifier.</summary>
    public Guid InviteeUserId { get; private set; }

    /// <summary>Gets the invitation status.</summary>
    public CircleInvitationStatus Status { get; private set; }

    /// <summary>Creates a pending invitation.</summary>
    public static CircleInvitation Create(Guid circleId, Guid inviterUserId, Guid inviteeUserId) => new()
    {
        CircleId = circleId,
        InviterUserId = inviterUserId,
        InviteeUserId = inviteeUserId,
        Status = CircleInvitationStatus.Pending,
    };

    /// <summary>Accepts the invitation.</summary>
    public void Accept() => Status = CircleInvitationStatus.Accepted;

    /// <summary>Declines the invitation.</summary>
    public void Decline() => Status = CircleInvitationStatus.Declined;

    /// <summary>Cancels a pending invitation when its circle is archived.</summary>
    public void Cancel() => Status = CircleInvitationStatus.Cancelled;
}

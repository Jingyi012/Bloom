namespace Bloom.Domain.Circles;

/// <summary>Lifecycle state shown for a circle.</summary>
public enum CircleStatus
{
    Draft = 0,
    Sealed = 1,
    Bloomed = 2,
    Archived = 3,
}

/// <summary>Role held by a circle member.</summary>
public enum CircleMemberRole
{
    Creator = 0,
    Member = 1,
}

/// <summary>State of a circle invitation.</summary>
public enum CircleInvitationStatus
{
    Pending = 0,
    Accepted = 1,
    Declined = 2,
    Cancelled = 3,
}

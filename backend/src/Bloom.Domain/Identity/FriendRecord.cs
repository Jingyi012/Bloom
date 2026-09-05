using Bloom.Domain.Common;

namespace Bloom.Domain.Identity;

/// <summary>Remembers one friendship created through a Bloom circle or invitation.</summary>
public sealed class FriendRecord : AuditableEntity
{
    private FriendRecord() { }

    /// <summary>Gets the lower-ordered endpoint of this private friend record.</summary>
    public Guid UserId { get; private set; }

    /// <summary>Gets the higher-ordered endpoint of this private friend record.</summary>
    public Guid FriendUserId { get; private set; }

    /// <summary>Gets when this friendship was first recorded.</summary>
    public DateTimeOffset FirstAddedAtUtc { get; private set; }

    /// <summary>Gets when this friendship was most recently observed.</summary>
    public DateTimeOffset LastSeenAtUtc { get; private set; }

    /// <summary>Creates a canonical private friend record without storing an inverse duplicate.</summary>
    public static FriendRecord Create(Guid userId, Guid friendUserId, DateTimeOffset observedAtUtc)
    {
        if (userId == friendUserId) throw new ArgumentException("A user cannot befriend themselves.");
        var first = userId.CompareTo(friendUserId) < 0 ? userId : friendUserId;
        var second = first == userId ? friendUserId : userId;
        return new FriendRecord
        {
            UserId = first,
            FriendUserId = second,
            FirstAddedAtUtc = observedAtUtc.ToUniversalTime(),
            LastSeenAtUtc = observedAtUtc.ToUniversalTime(),
        };
    }

    /// <summary>Updates the last-observed instant.</summary>
    public void Touch(DateTimeOffset observedAtUtc) => LastSeenAtUtc = observedAtUtc.ToUniversalTime();
}

using Bloom.Domain.Common;

namespace Bloom.Domain.Circles;

/// <summary>Represents a private group diary with a fixed bloom instant.</summary>
public sealed class Circle : AuditableEntity
{
    private readonly List<CircleMember> _members = [];

    private Circle()
    {
    }

    /// <summary>Gets the user who planted the circle.</summary>
    public Guid CreatorUserId { get; private set; }

    /// <summary>Gets the display name.</summary>
    public string Name { get; private set; } = string.Empty;

    /// <summary>Gets the decorative circle emoji.</summary>
    public string Emoji { get; private set; } = "🌱";

    /// <summary>Gets the immutable UTC instant at which the circle blooms.</summary>
    public DateTimeOffset BloomAtUtc { get; private set; }

    /// <summary>Gets the IANA time zone selected by the creator.</summary>
    public string TimeZoneId { get; private set; } = "UTC";

    /// <summary>Gets the persisted lifecycle state.</summary>
    public CircleStatus Status { get; private set; }

    /// <summary>Gets the circle members.</summary>
    public IReadOnlyCollection<CircleMember> Members => _members.AsReadOnly();

    /// <summary>Creates an immediately sealed circle and its creator membership.</summary>
    public static Circle Create(
        Guid creatorUserId,
        string name,
        string emoji,
        DateTimeOffset bloomAtUtc,
        string timeZoneId,
        DateTimeOffset createdAtUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(timeZoneId);
        if (creatorUserId == Guid.Empty) throw new ArgumentException("Creator is required.", nameof(creatorUserId));
        if (bloomAtUtc <= createdAtUtc) throw new ArgumentException("Bloom time must be in the future.", nameof(bloomAtUtc));

        var circle = new Circle
        {
            CreatorUserId = creatorUserId,
            Name = name.Trim(),
            Emoji = string.IsNullOrWhiteSpace(emoji) ? "🌱" : emoji.Trim(),
            BloomAtUtc = bloomAtUtc.ToUniversalTime(),
            TimeZoneId = timeZoneId.Trim(),
            Status = CircleStatus.Sealed,
        };
        circle._members.Add(CircleMember.Create(circle.Id, creatorUserId, CircleMemberRole.Creator, createdAtUtc));
        return circle;
    }

    /// <summary>Gets the current status derived from server time.</summary>
    public CircleStatus GetCurrentStatus(DateTimeOffset nowUtc)
    {
        if (Status == CircleStatus.Archived) return Status;
        return nowUtc >= BloomAtUtc ? CircleStatus.Bloomed : Status;
    }

    /// <summary>Gets whether the user is an active member.</summary>
    public bool HasActiveMember(Guid userId) => _members.Any(member => member.UserId == userId && member.LeftAtUtc is null);

    /// <summary>Updates creator-controlled circle details before the circle blooms.</summary>
    public void Update(string name, string emoji, DateTimeOffset bloomAtUtc, string timeZoneId, DateTimeOffset nowUtc)
    {
        if (GetCurrentStatus(nowUtc) == CircleStatus.Bloomed)
            throw new InvalidOperationException("A bloomed circle cannot be edited.");
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(timeZoneId);
        if (bloomAtUtc <= nowUtc) throw new ArgumentException("Bloom time must be in the future.", nameof(bloomAtUtc));
        Name = name.Trim();
        Emoji = string.IsNullOrWhiteSpace(emoji) ? "ðŸŒ±" : emoji.Trim();
        BloomAtUtc = bloomAtUtc.ToUniversalTime();
        TimeZoneId = timeZoneId.Trim();
    }

    /// <summary>Archives a sealed circle while preserving its audit history.</summary>
    public void Archive(DateTimeOffset nowUtc)
    {
        if (GetCurrentStatus(nowUtc) == CircleStatus.Bloomed)
            throw new InvalidOperationException("A bloomed circle cannot be deleted.");
        Status = CircleStatus.Archived;
    }

    /// <summary>Gets a member by user identifier.</summary>
    public CircleMember? FindMember(Guid userId) => _members.FirstOrDefault(member => member.UserId == userId);

    /// <summary>Adds a member to a sealed circle.</summary>
    public CircleMember AddMember(Guid userId, DateTimeOffset joinedAtUtc)
    {
        if (GetCurrentStatus(joinedAtUtc) == CircleStatus.Bloomed) throw new InvalidOperationException("A circle cannot accept members after it blooms.");
        if (_members.Any(member => member.UserId == userId)) throw new InvalidOperationException("A departed member cannot rejoin this circle.");

        var member = CircleMember.Create(Id, userId, CircleMemberRole.Member, joinedAtUtc);
        _members.Add(member);
        return member;
    }

    /// <summary>Marks an active member as departed.</summary>
    public void Leave(Guid userId, DateTimeOffset leftAtUtc)
    {
        var member = FindMember(userId) ?? throw new InvalidOperationException("The user is not a member of this circle.");
        if (member.Role == CircleMemberRole.Creator) throw new InvalidOperationException("The circle creator cannot leave the circle yet.");
        member.Leave(leftAtUtc);
    }
}

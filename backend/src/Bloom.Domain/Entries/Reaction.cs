using Bloom.Domain.Common;

namespace Bloom.Domain.Entries;

/// <summary>Represents one user's emoji reaction to a bloomed publication.</summary>
public sealed class Reaction : AuditableEntity
{
    private Reaction()
    {
    }

    /// <summary>Gets the publication being reacted to.</summary>
    public Guid EntryPublicationId { get; private set; }

    /// <summary>Gets the reacting user.</summary>
    public Guid UserId { get; private set; }

    /// <summary>Gets the allow-listed emoji code.</summary>
    public string EmojiCode { get; private set; } = string.Empty;

    /// <summary>Creates a reaction.</summary>
    public static Reaction Create(Guid entryPublicationId, Guid userId, string emojiCode)
    {
        if (entryPublicationId == Guid.Empty) throw new ArgumentException("Publication is required.", nameof(entryPublicationId));
        if (userId == Guid.Empty) throw new ArgumentException("User is required.", nameof(userId));
        ArgumentException.ThrowIfNullOrWhiteSpace(emojiCode);
        return new Reaction { EntryPublicationId = entryPublicationId, UserId = userId, EmojiCode = emojiCode.Trim() };
    }
}

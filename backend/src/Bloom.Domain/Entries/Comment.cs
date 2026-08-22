using Bloom.Domain.Common;

namespace Bloom.Domain.Entries;

/// <summary>Represents a post-bloom conversation comment.</summary>
public sealed class Comment : AuditableEntity
{
    private Comment()
    {
    }

    /// <summary>Gets the publication being commented on.</summary>
    public Guid EntryPublicationId { get; private set; }

    /// <summary>Gets the author of the comment.</summary>
    public Guid AuthorUserId { get; private set; }

    /// <summary>Gets the comment body.</summary>
    public string Body { get; private set; } = string.Empty;

    /// <summary>Gets whether a moderator has hidden this comment.</summary>
    public bool IsHidden { get; private set; }

    /// <summary>Creates a comment.</summary>
    public static Comment Create(Guid entryPublicationId, Guid authorUserId, string body)
    {
        if (entryPublicationId == Guid.Empty) throw new ArgumentException("Publication is required.", nameof(entryPublicationId));
        if (authorUserId == Guid.Empty) throw new ArgumentException("Author is required.", nameof(authorUserId));
        ArgumentException.ThrowIfNullOrWhiteSpace(body);
        if (body.Trim().Length > 1000) throw new ArgumentException("Comment cannot exceed 1,000 characters.", nameof(body));
        return new Comment { EntryPublicationId = entryPublicationId, AuthorUserId = authorUserId, Body = body.Trim() };
    }

    /// <summary>Hides a comment for moderation.</summary>
    public void Hide() => IsHidden = true;
}

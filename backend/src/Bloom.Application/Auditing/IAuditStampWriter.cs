using Bloom.Domain.Common;

namespace Bloom.Application.Auditing;

/// <summary>Applies server-owned audit fields to a domain entity.</summary>
public interface IAuditStampWriter
{
    /// <summary>Stamps an entity as newly created.</summary>
    /// <param name="entity">The entity to stamp.</param>
    /// <param name="actorUserId">The authenticated actor, or null for system work.</param>
    void StampCreated(IAuditableEntity entity, Guid? actorUserId);

    /// <summary>Stamps an entity as modified.</summary>
    /// <param name="entity">The entity to stamp.</param>
    /// <param name="actorUserId">The authenticated actor, or null for system work.</param>
    void StampModified(IAuditableEntity entity, Guid? actorUserId);

    /// <summary>Stamps an entity as soft-deleted.</summary>
    /// <param name="entity">The entity to stamp.</param>
    /// <param name="actorUserId">The authenticated actor, or null for system work.</param>
    void StampDeleted(IAuditableEntity entity, Guid? actorUserId);
}

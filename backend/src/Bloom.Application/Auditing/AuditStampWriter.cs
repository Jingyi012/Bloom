using Bloom.Domain.Common;

namespace Bloom.Application.Auditing;

/// <summary>Applies audit values without allowing clients to supply timestamps.</summary>
public sealed class AuditStampWriter(IAuditClock clock) : IAuditStampWriter
{
    private readonly IAuditClock _clock = clock ?? throw new ArgumentNullException(nameof(clock));

    /// <inheritdoc />
    public void StampCreated(IAuditableEntity entity, Guid? actorUserId)
    {
        ArgumentNullException.ThrowIfNull(entity);
        var now = _clock.UtcNow;
        entity.CreatedAtUtc = now;
        entity.CreatedByUserId = actorUserId;
        entity.LastModifiedAtUtc = now;
        entity.LastModifiedByUserId = actorUserId;
        entity.DeletedAtUtc = null;
        entity.DeletedByUserId = null;
    }

    /// <inheritdoc />
    public void StampModified(IAuditableEntity entity, Guid? actorUserId)
    {
        ArgumentNullException.ThrowIfNull(entity);
        entity.LastModifiedAtUtc = _clock.UtcNow;
        entity.LastModifiedByUserId = actorUserId;
    }

    /// <inheritdoc />
    public void StampDeleted(IAuditableEntity entity, Guid? actorUserId)
    {
        ArgumentNullException.ThrowIfNull(entity);
        var now = _clock.UtcNow;
        entity.DeletedAtUtc = now;
        entity.DeletedByUserId = actorUserId;
        entity.LastModifiedAtUtc = now;
        entity.LastModifiedByUserId = actorUserId;
    }
}

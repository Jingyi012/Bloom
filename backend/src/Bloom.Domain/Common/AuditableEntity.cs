namespace Bloom.Domain.Common;

/// <summary>
/// Base class for Bloom entities with centrally populated audit metadata.
/// </summary>
public abstract class AuditableEntity : IAuditableEntity
{
    /// <inheritdoc />
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <inheritdoc />
    public DateTimeOffset CreatedAtUtc { get; set; }

    /// <inheritdoc />
    public Guid? CreatedByUserId { get; set; }

    /// <inheritdoc />
    public DateTimeOffset LastModifiedAtUtc { get; set; }

    /// <inheritdoc />
    public Guid? LastModifiedByUserId { get; set; }

    /// <inheritdoc />
    public DateTimeOffset? DeletedAtUtc { get; set; }

    /// <inheritdoc />
    public Guid? DeletedByUserId { get; set; }
}

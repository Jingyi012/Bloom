namespace Bloom.Domain.Common;

/// <summary>
/// Defines the audit metadata required by every persisted Bloom entity.
/// </summary>
public interface IAuditableEntity
{
    /// <summary>Gets or sets the entity identifier.</summary>
    Guid Id { get; set; }

    /// <summary>Gets or sets the UTC time at which the entity was created.</summary>
    DateTimeOffset CreatedAtUtc { get; set; }

    /// <summary>Gets or sets the user or system actor that created the entity.</summary>
    Guid? CreatedByUserId { get; set; }

    /// <summary>Gets or sets the UTC time at which the entity was last modified.</summary>
    DateTimeOffset LastModifiedAtUtc { get; set; }

    /// <summary>Gets or sets the user or system actor that last modified the entity.</summary>
    Guid? LastModifiedByUserId { get; set; }

    /// <summary>Gets or sets the UTC time at which the entity was soft-deleted.</summary>
    DateTimeOffset? DeletedAtUtc { get; set; }

    /// <summary>Gets or sets the user or system actor that soft-deleted the entity.</summary>
    Guid? DeletedByUserId { get; set; }
}

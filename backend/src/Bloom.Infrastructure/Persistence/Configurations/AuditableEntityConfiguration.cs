using Bloom.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Shared Fluent API mapping for Bloom audit metadata.</summary>
internal static class AuditableEntityConfiguration
{
    /// <summary>Configures common audit columns and a PascalCase table name.</summary>
    public static void Configure<TEntity>(this EntityTypeBuilder<TEntity> builder, string tableName)
        where TEntity : AuditableEntity
    {
        builder.ToTable(tableName, "bloom");
        builder.HasKey(entity => entity.Id);
        builder.Property(entity => entity.Id).ValueGeneratedNever();
        builder.Property(entity => entity.CreatedAtUtc).IsRequired();
        builder.Property(entity => entity.LastModifiedAtUtc).IsRequired();
        builder.HasIndex(entity => entity.DeletedAtUtc);
    }
}

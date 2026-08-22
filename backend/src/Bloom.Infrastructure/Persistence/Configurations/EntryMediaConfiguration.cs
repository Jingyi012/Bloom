using Bloom.Domain.Entries;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for entry media links.</summary>
public sealed class EntryMediaConfiguration : IEntityTypeConfiguration<EntryMedia>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<EntryMedia> builder)
    {
        builder.Configure(nameof(EntryMedia));
        builder.HasIndex(entity => new { entity.EntryPublicationId, entity.SortOrder }).IsUnique();
        builder.HasOne<EntryPublication>().WithMany().HasForeignKey(entity => entity.EntryPublicationId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<MediaAsset>().WithMany().HasForeignKey(entity => entity.MediaAssetId).OnDelete(DeleteBehavior.Cascade);
    }
}

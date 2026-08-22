using Bloom.Domain.Entries;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for local media metadata.</summary>
public sealed class MediaAssetConfiguration : IEntityTypeConfiguration<MediaAsset>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<MediaAsset> builder)
    {
        builder.Configure(nameof(MediaAsset));
        builder.Property(entity => entity.SortOrder).IsRequired();
        builder.Property(entity => entity.RelativePath).HasMaxLength(500).IsRequired();
        builder.Property(entity => entity.ContentType).HasMaxLength(100).IsRequired();
        builder.Property(entity => entity.Sha256).HasMaxLength(128).IsRequired();
        builder.HasIndex(entity => entity.RelativePath).IsUnique();
        builder.HasIndex(entity => new { entity.DiaryEntryId, entity.SortOrder }).IsUnique();
        builder.HasOne<DiaryEntry>().WithMany().HasForeignKey(entity => entity.DiaryEntryId).OnDelete(DeleteBehavior.Cascade);
    }
}

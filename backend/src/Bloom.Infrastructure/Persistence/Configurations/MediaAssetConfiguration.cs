using Bloom.Domain.Entries;
using Bloom.Domain.Identity;
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
        builder.Property(entity => entity.RelativePath).HasMaxLength(500).IsRequired();
        builder.Property(entity => entity.ContentType).HasMaxLength(100).IsRequired();
        builder.Property(entity => entity.Sha256).HasMaxLength(128).IsRequired();
        builder.HasIndex(entity => entity.RelativePath).IsUnique();
        builder.HasOne<User>().WithMany().HasForeignKey(entity => entity.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
    }
}

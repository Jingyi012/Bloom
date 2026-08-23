using Bloom.Domain.Circles;
using Bloom.Domain.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for the <see cref="CircleMember"/> join entity.</summary>
public sealed class CircleMemberConfiguration : IEntityTypeConfiguration<CircleMember>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<CircleMember> builder)
    {
        builder.Configure(nameof(CircleMember));
        builder.Property(entity => entity.Role).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.HasIndex(entity => new { entity.CircleId, entity.UserId }).IsUnique();
        builder.HasIndex(entity => new { entity.UserId, entity.LeftAtUtc });
        builder.HasOne<Circle>().WithMany().HasForeignKey(entity => entity.CircleId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(entity => entity.UserId).OnDelete(DeleteBehavior.Restrict);
    }
}

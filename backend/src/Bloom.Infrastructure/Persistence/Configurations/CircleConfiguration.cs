using Bloom.Domain.Circles;
using Bloom.Domain.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for the <see cref="Circle"/> aggregate.</summary>
public sealed class CircleConfiguration : IEntityTypeConfiguration<Circle>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<Circle> builder)
    {
        builder.Configure(nameof(Circle));
        builder.Property(entity => entity.Name).HasMaxLength(120).IsRequired();
        builder.Property(entity => entity.Emoji).HasMaxLength(16).IsRequired();
        builder.Property(entity => entity.TimeZoneId).HasMaxLength(100).IsRequired();
        builder.Property(entity => entity.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.HasIndex(entity => entity.BloomAtUtc);
        builder.HasOne<User>().WithMany().HasForeignKey(entity => entity.CreatorUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(entity => entity.Members)
            .WithOne()
            .HasForeignKey(entity => entity.CircleId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(entity => entity.Members).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

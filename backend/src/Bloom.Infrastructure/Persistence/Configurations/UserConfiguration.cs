using Bloom.Domain.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for the <see cref="User"/> aggregate.</summary>
public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Configure(nameof(User));
        builder.Property(entity => entity.GoogleSubject).HasMaxLength(255).IsRequired();
        builder.Property(entity => entity.Email).HasMaxLength(320).IsRequired();
        builder.Property(entity => entity.EmailNormalized).HasMaxLength(320).IsRequired();
        builder.Property(entity => entity.DisplayName).HasMaxLength(200).IsRequired();
        builder.Property(entity => entity.GoogleAvatarUrl).HasMaxLength(2048);
        builder.Property(entity => entity.TimeZoneId).HasMaxLength(100).IsRequired();
        builder.HasIndex(entity => entity.GoogleSubject).IsUnique();
        builder.HasIndex(entity => entity.EmailNormalized).IsUnique();
    }
}

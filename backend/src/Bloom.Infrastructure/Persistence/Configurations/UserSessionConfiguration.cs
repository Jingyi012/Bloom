using Bloom.Domain.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for the <see cref="UserSession"/> entity.</summary>
public sealed class UserSessionConfiguration : IEntityTypeConfiguration<UserSession>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<UserSession> builder)
    {
        builder.Configure(nameof(UserSession));
        builder.Property(entity => entity.RefreshTokenHash).HasMaxLength(128).IsRequired();
        builder.HasIndex(entity => entity.RefreshTokenHash).IsUnique();
        builder.HasIndex(entity => new { entity.UserId, entity.ExpiresAtUtc });
        builder.HasOne<User>().WithMany().HasForeignKey(entity => entity.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

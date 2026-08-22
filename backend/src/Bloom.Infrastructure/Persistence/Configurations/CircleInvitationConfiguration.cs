using Bloom.Domain.Circles;
using Bloom.Domain.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for the <see cref="CircleInvitation"/> entity.</summary>
public sealed class CircleInvitationConfiguration : IEntityTypeConfiguration<CircleInvitation>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<CircleInvitation> builder)
    {
        builder.Configure(nameof(CircleInvitation));
        builder.Property(entity => entity.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.HasIndex(entity => new { entity.CircleId, entity.InviteeUserId, entity.Status });
        builder.HasIndex(entity => new { entity.InviteeUserId, entity.Status });
        builder.HasOne<Circle>().WithMany().HasForeignKey(entity => entity.CircleId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(entity => entity.InviterUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(entity => entity.InviteeUserId).OnDelete(DeleteBehavior.Restrict);
    }
}

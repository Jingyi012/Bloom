using Bloom.Domain.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for private friend history.</summary>
public sealed class FriendRecordConfiguration : IEntityTypeConfiguration<FriendRecord>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<FriendRecord> builder)
    {
        builder.Configure(nameof(FriendRecord));
        builder.HasIndex(entity => new { entity.UserId, entity.FriendUserId }).IsUnique();
        builder.HasIndex(entity => new { entity.UserId, entity.LastSeenAtUtc });
        builder.HasOne<User>().WithMany().HasForeignKey(entity => entity.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(entity => entity.FriendUserId).OnDelete(DeleteBehavior.Restrict);
    }
}

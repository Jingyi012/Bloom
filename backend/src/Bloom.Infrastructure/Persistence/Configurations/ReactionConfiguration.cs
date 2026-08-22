using Bloom.Domain.Entries;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for reactions.</summary>
public sealed class ReactionConfiguration : IEntityTypeConfiguration<Reaction>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<Reaction> builder)
    {
        builder.Configure(nameof(Reaction));
        builder.Property(entity => entity.EmojiCode).HasMaxLength(16).IsRequired();
        builder.HasIndex(entity => new { entity.EntryPublicationId, entity.UserId, entity.EmojiCode }).IsUnique();
        builder.HasIndex(entity => new { entity.EntryPublicationId, entity.CreatedAtUtc });
        builder.HasOne<EntryPublication>().WithMany().HasForeignKey(entity => entity.EntryPublicationId).OnDelete(DeleteBehavior.Cascade);
    }
}

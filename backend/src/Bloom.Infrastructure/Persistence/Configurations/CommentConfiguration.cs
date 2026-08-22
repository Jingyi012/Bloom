using Bloom.Domain.Entries;
using Bloom.Domain.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for comments.</summary>
public sealed class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<Comment> builder)
    {
        builder.Configure(nameof(Comment));
        builder.Property(entity => entity.Body).HasMaxLength(1000).IsRequired();
        builder.Property(entity => entity.IsHidden).IsRequired();
        builder.HasIndex(entity => new { entity.EntryPublicationId, entity.CreatedAtUtc });
        builder.HasOne<EntryPublication>().WithMany().HasForeignKey(entity => entity.EntryPublicationId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<User>().WithMany().HasForeignKey(entity => entity.AuthorUserId).OnDelete(DeleteBehavior.Restrict);
    }
}

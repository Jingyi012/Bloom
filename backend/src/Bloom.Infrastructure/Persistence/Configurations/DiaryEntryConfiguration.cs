using Bloom.Domain.Entries;
using Bloom.Domain.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for the <see cref="DiaryEntry"/> entity.</summary>
public sealed class DiaryEntryConfiguration : IEntityTypeConfiguration<DiaryEntry>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<DiaryEntry> builder)
    {
        builder.Configure(nameof(DiaryEntry));
        builder.Property(entity => entity.ClientEntryId).HasMaxLength(100).IsRequired();
        builder.Property(entity => entity.AuthorTimeZoneId).HasMaxLength(100).IsRequired();
        builder.Property(entity => entity.Text).HasMaxLength(20000).IsRequired();
        builder.Property(entity => entity.Mood).HasMaxLength(32);
        builder.Property(entity => entity.PromptKey).HasMaxLength(128);
        builder.HasIndex(entity => new { entity.AuthorUserId, entity.ClientEntryId }).IsUnique();
        builder.HasOne<User>().WithMany().HasForeignKey(entity => entity.AuthorUserId).OnDelete(DeleteBehavior.Restrict);
    }
}

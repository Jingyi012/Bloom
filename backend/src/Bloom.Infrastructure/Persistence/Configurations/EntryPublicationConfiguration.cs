using Bloom.Domain.Circles;
using Bloom.Domain.Entries;
using Bloom.Domain.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Bloom.Infrastructure.Persistence.Configurations;

/// <summary>Fluent API mapping for the <see cref="EntryPublication"/> entity.</summary>
public sealed class EntryPublicationConfiguration : IEntityTypeConfiguration<EntryPublication>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<EntryPublication> builder)
    {
        builder.Configure(nameof(EntryPublication));
        builder.Property(entity => entity.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.HasIndex(entity => new { entity.CircleId, entity.AuthorUserId, entity.AuthorLocalDate }).IsUnique();
        builder.HasIndex(entity => new { entity.CircleId, entity.AuthorLocalDate, entity.SubmittedAtUtc });
        builder.HasOne<DiaryEntry>().WithMany().HasForeignKey(entity => entity.DiaryEntryId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Circle>().WithMany().HasForeignKey(entity => entity.CircleId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>().WithMany().HasForeignKey(entity => entity.AuthorUserId).OnDelete(DeleteBehavior.Restrict);
    }
}

using Bloom.Domain.Circles;
using Bloom.Domain.Entries;
using Bloom.Domain.Identity;
using Microsoft.EntityFrameworkCore;

namespace Bloom.Infrastructure.Persistence;

/// <summary>EF Core persistence boundary for Bloom's PostgreSQL database.</summary>
public sealed class BloomDbContext(DbContextOptions<BloomDbContext> options) : DbContext(options)
{
    /// <summary>Gets persisted users.</summary>
    public DbSet<User> Users => Set<User>();

    /// <summary>Gets persisted circles.</summary>
    public DbSet<Circle> Circles => Set<Circle>();

    /// <summary>Gets persisted circle memberships.</summary>
    public DbSet<CircleMember> CircleMembers => Set<CircleMember>();

    /// <summary>Gets persisted invitations.</summary>
    public DbSet<CircleInvitation> CircleInvitations => Set<CircleInvitation>();

    /// <summary>Gets persisted refresh-token sessions.</summary>
    public DbSet<UserSession> UserSessions => Set<UserSession>();

    /// <summary>Gets persisted diary entries.</summary>
    public DbSet<DiaryEntry> DiaryEntries => Set<DiaryEntry>();

    /// <summary>Gets persisted circle publications.</summary>
    public DbSet<EntryPublication> EntryPublications => Set<EntryPublication>();

    /// <summary>Gets persisted reactions.</summary>
    public DbSet<Reaction> Reactions => Set<Reaction>();

    /// <summary>Gets persisted comments.</summary>
    public DbSet<Comment> Comments => Set<Comment>();

    /// <summary>Gets persisted media assets.</summary>
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BloomDbContext).Assembly);
    }
}

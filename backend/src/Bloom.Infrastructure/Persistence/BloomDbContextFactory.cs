using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Bloom.Infrastructure.Persistence;

/// <summary>Creates the database context for EF migration commands.</summary>
public sealed class BloomDbContextFactory : IDesignTimeDbContextFactory<BloomDbContext>
{
    /// <inheritdoc />
    public BloomDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("BLOOM_DB_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=bloom;Username=bloom;Password=bloom";
        var options = new DbContextOptionsBuilder<BloomDbContext>()
            .UseNpgsql(connectionString)
            .Options;
        return new BloomDbContext(options);
    }
}

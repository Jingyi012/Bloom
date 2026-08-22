using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Bloom.Infrastructure.Persistence;

/// <summary>Helpers for applying Bloom database migrations when they are generated.</summary>
public static class DatabaseMigrationExtensions
{
    /// <summary>Applies pending EF Core migrations during an explicitly enabled startup.</summary>
    public static async Task ApplyBloomMigrationsAsync(this WebApplication app, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(app);
        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<BloomDbContext>();
        await db.Database.MigrateAsync(cancellationToken).ConfigureAwait(false);
    }
}

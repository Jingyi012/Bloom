using Bloom.Application.Auditing;
using Bloom.Application.Identity;
using Bloom.Application.Circles;
using Bloom.Application.Entries;
using Bloom.Infrastructure.Circles;
using Bloom.Infrastructure.Entries;
using Bloom.Infrastructure.Identity;
using Bloom.Application.Media;
using Bloom.Infrastructure.Media;
using Bloom.Application.Security;
using Bloom.Infrastructure.Security;
using Bloom.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Bloom.Infrastructure;

/// <summary>Registers the current infrastructure adapters.</summary>
public static class DependencyInjection
{
    /// <summary>Registers the PostgreSQL-backed Bloom infrastructure.</summary>
    /// <param name="services">The application service collection.</param>
    /// <param name="configuration">The application configuration.</param>
    /// <returns>The same service collection.</returns>
    public static IServiceCollection AddBloomInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);
        var connectionString = configuration.GetConnectionString("BloomDb");
        ArgumentException.ThrowIfNullOrWhiteSpace(connectionString);
        services.AddSingleton<IAuditClock, SystemAuditClock>();
        services.AddSingleton<IAuditStampWriter, AuditStampWriter>();
        services.AddDbContext<BloomDbContext>(options => options.UseNpgsql(connectionString));
        services.AddOptions<ImageStorageOptions>()
            .Bind(configuration.GetSection(ImageStorageOptions.SectionName))
            .Validate(settings => !string.IsNullOrWhiteSpace(settings.RootPath), "ImageStorage:RootPath is required.")
            .Validate(settings => settings.MaxBytes is > 0 and <= 25 * 1024 * 1024, "ImageStorage:MaxBytes must be between 1 byte and 25 MB.")
            .ValidateOnStart();
        services.AddSingleton<IImageStorage, LocalImageStorage>();
        services.AddSingleton<IEntryProtector, DataProtectionEntryProtector>();
        services.AddScoped<IMediaService, EfMediaService>();
        services.AddScoped<IGoogleUserService, EfGoogleUserService>();
        services.AddScoped<ICircleService, EfCircleService>();
        services.AddScoped<IEntryService, EfEntryService>();
        return services;
    }
}

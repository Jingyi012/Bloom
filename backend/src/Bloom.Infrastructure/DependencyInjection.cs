using Bloom.Application.Auditing;
using Bloom.Application.Identity;
using Bloom.Infrastructure.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace Bloom.Infrastructure;

/// <summary>Registers the current infrastructure adapters.</summary>
public static class DependencyInjection
{
    /// <summary>Registers the temporary in-memory adapters for the first vertical slice.</summary>
    /// <param name="services">The application service collection.</param>
    /// <returns>The same service collection.</returns>
    public static IServiceCollection AddBloomInfrastructure(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);
        services.AddSingleton<IAuditClock, SystemAuditClock>();
        services.AddSingleton<IAuditStampWriter, AuditStampWriter>();
        services.AddSingleton<IGoogleUserService, InMemoryGoogleUserService>();
        return services;
    }
}

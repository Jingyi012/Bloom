using Bloom.Domain.Identity;

namespace Bloom.Application.Identity;

/// <summary>Finds or provisions local users from validated Google identities.</summary>
public interface IGoogleUserService
{
    /// <summary>Gets an existing user or creates one for a verified Google identity.</summary>
    /// <param name="identity">The validated provider identity.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The local user.</returns>
    Task<User> FindOrProvisionAsync(GoogleIdentity identity, CancellationToken cancellationToken);

    /// <summary>Finds a local user by Bloom identifier.</summary>
    /// <param name="userId">The Bloom user identifier.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The local user, or null when it does not exist.</returns>
    Task<User?> FindByIdAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Finds an existing Bloom user by normalized email address.</summary>
    /// <param name="email">The email address to search.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The matching user, or null when no user exists.</returns>
    Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken);
}

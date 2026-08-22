using Bloom.Domain.Identity;

namespace Bloom.Application.Identity;

/// <summary>Creates the short-lived Bloom session returned after Google sign-in.</summary>
public interface ISessionTokenService
{
    /// <summary>Creates access and refresh session tokens for a local user.</summary>
    /// <param name="user">The local Bloom user.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A token pair.</returns>
    Task<SessionTokenPair> CreateAsync(User user, CancellationToken cancellationToken);

    /// <summary>Rotates a valid refresh token.</summary>
    /// <param name="refreshToken">The opaque refresh token.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A new token pair, or null when the token is invalid.</returns>
    Task<SessionTokenPair?> RefreshAsync(string refreshToken, CancellationToken cancellationToken);

    /// <summary>Revokes a refresh token.</summary>
    /// <param name="refreshToken">The opaque refresh token.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    Task RevokeAsync(string refreshToken, CancellationToken cancellationToken);
}

/// <summary>Contains Bloom session credentials.</summary>
public sealed record SessionTokenPair(string AccessToken, string RefreshToken, DateTimeOffset AccessTokenExpiresAtUtc);
